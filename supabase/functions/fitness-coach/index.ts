import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Short, positive, role-based prompts. Avoid long "don't" lists — they grow
// over time and increase hallucination. Describe the role and let the model behave.
const PROMPTS = {
  advice: `Fitness coach. Reply like a knowledgeable friend texting back: direct, specific, sized to the question. Topics: form, programming, nutrition, recovery, injury prevention.`,

  plan: `Fitness coach building a personalized program. Ask one or two focused questions at a time until you have what you need (goals, experience, equipment, schedule, limitations), then deliver the plan.

End the final plan message with this JSON block:

\`\`\`WORKOUT_PLAN_JSON
{
  "name": "Plan Name",
  "description": "Brief description",
  "duration_weeks": 4,
  "days": [
    {
      "id": 1,
      "name": "Day Name",
      "shortName": "Short",
      "type": "training|rest|conditioning",
      "focus": "Muscle groups",
      "warmup": ["Exercise 1", "Exercise 2"],
      "exercises": [
        { "id": "1-1", "name": "Exercise", "sets": 4, "reps": "8-10", "rest": "90s", "notes": "Form tips" }
      ],
      "extras": ["Additional notes"]
    }
  ]
}
\`\`\``,

  general: `Friendly fitness assistant. Talk like a normal person — match the user's tone and length.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, threadType = "advice", context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Select the appropriate system prompt
    let systemPrompt = PROMPTS[threadType as keyof typeof PROMPTS] || PROMPTS.advice;

    // Inject live workout context so the agent can answer day-specific questions
    // ("what am I doing today?", "how many reps did I do for bench yesterday?", etc.)
    if (context && typeof context === "object") {
      const ctxLines: string[] = ["", "---", "CURRENT USER CONTEXT (live data — use it):"];
      if (context.planName) ctxLines.push(`Active plan: ${context.planName}`);
      if (context.todayName) ctxLines.push(`Today (${context.todayLabel ?? ""}): ${context.todayName}${context.todayFocus ? ` — ${context.todayFocus}` : ""}`);
      if (Array.isArray(context.todayExercises) && context.todayExercises.length > 0) {
        ctxLines.push("Today's exercises:");
        for (const ex of context.todayExercises) {
          ctxLines.push(`  • ${ex.name} — ${ex.sets}×${ex.reps} (rest ${ex.rest})${ex.notes ? ` — ${ex.notes}` : ""}`);
        }
      }
      if (Array.isArray(context.recentLogs) && context.recentLogs.length > 0) {
        ctxLines.push("Recent logged sets (most recent first):");
        for (const log of context.recentLogs.slice(0, 20)) {
          ctxLines.push(`  • ${log.date} — ${log.exercise}: ${log.sets} sets, ${log.reps} reps total, top weight ${log.weight} lbs`);
        }
      }
      const m = context.monthSummary;
      if (m && typeof m === "object") {
        ctxLines.push(`Month so far (${m.monthLabel}): ${m.completedSessions}/${m.plannedSessions} planned sessions completed.`);
        if (Array.isArray(m.statedGoals) && m.statedGoals.length > 0) {
          ctxLines.push(`Stated goals: ${m.statedGoals.join(", ")}.`);
        }
        if (Array.isArray(m.substitutes) && m.substitutes.length > 0) {
          ctxLines.push(`Substitute activities (~${m.estimatedSubstituteEffortPct}% effort vs a full session, on average):`);
          for (const s of m.substitutes.slice(0, 12)) {
            ctxLines.push(`  • ${s.date} — ${s.activity} ${s.durationMin}m ${s.intensity}${s.reason ? ` (${s.reason})` : ""}${s.note ? ` — ${s.note}` : ""}`);
          }
        }
        if (Array.isArray(m.missedDays) && m.missedDays.length > 0) {
          ctxLines.push(`Missed days: ${m.missedDays.map((d: any) => `${d.date}${d.reason ? ` (${d.reason})` : ""}`).join(", ")}.`);
        }
        ctxLines.push(`If the user asks how their month is going, give an honest read: compare actual work against stated goals, credit substitutes for what they realistically contribute, name the gap plainly, and suggest what to tailor next month.`);
      }
      const bw = context.bodyweight;
      if (bw && typeof bw === "object") {
        ctxLines.push(`Bodyweight: currently ${bw.current} lbs (as of ${bw.currentDate}), ${bw.changeSinceStart >= 0 ? "up" : "down"} ${Math.abs(bw.changeSinceStart)} lbs since tracking started at ${bw.startOfRecord} lbs.`);
        if (Array.isArray(bw.history) && bw.history.length > 1) {
          ctxLines.push(`Weight history: ${bw.history.map((h: any) => `${h.date}: ${h.value}`).join(", ")}.`);
        }
        ctxLines.push(`When building or revising a plan, factor in this bodyweight and its trend against their goal. If weight is moving the wrong way for the stated goal, say so and adjust volume/intensity/nutrition guidance accordingly.`);
      }
      if (Array.isArray(context.userNotes) && context.userNotes.length > 0) {
        ctxLines.push(`User's own notes/ideas (their words — treat as high-signal intent, remember and act on these):`);
        for (const n of context.userNotes) {
          ctxLines.push(`  • ${n.date}: ${n.note}`);
        }
      }
      ctxLines.push("Use this data when relevant to the user's question.");
      systemPrompt += "\n" + ctxLines.join("\n");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Fitness coach error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
