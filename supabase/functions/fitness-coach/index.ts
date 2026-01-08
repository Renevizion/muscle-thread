import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Different system prompts based on thread type
const PROMPTS = {
  advice: `You are a knowledgeable fitness coach. Answer questions directly and concisely.

RESPONSE RULES:
- Match your response length to the question complexity
- Simple questions → 1-3 sentences
- Form checks → Brief tips, not essays
- Only elaborate if the user asks "explain" or "why"
- No fluff, no repetition, get to the point

You know about: exercise form, nutrition basics, recovery, programming, injury prevention.`,

  plan: `You are an expert fitness coach creating personalized workout programs.

WORKFLOW:
1. Gather info: goals, experience, equipment, schedule, limitations
2. Ask 1-2 focused questions at a time (not 5)
3. When you have enough info, generate the plan

When outputting a final plan, include this JSON block:

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
        {
          "id": "1-1",
          "name": "Exercise Name",
          "sets": 4,
          "reps": "8-10",
          "rest": "90s",
          "notes": "Form tips"
        }
      ],
      "extras": ["Additional notes"]
    }
  ]
}
\`\`\`

Be encouraging but efficient. Don't repeat information the user already gave you.`,

  general: `You are a helpful fitness assistant. Be conversational and helpful.

Keep responses appropriately sized:
- Quick questions get quick answers
- Complex topics get thorough explanations when asked

You can discuss fitness, health, motivation, and related topics.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, threadType = "advice" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Select the appropriate system prompt
    const systemPrompt = PROMPTS[threadType as keyof typeof PROMPTS] || PROMPTS.advice;

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
