import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert fitness coach and personal trainer. You help users create personalized workout programs based on their goals, experience level, available equipment, and constraints.

Your approach:
1. Ask clarifying questions to understand their goals (muscle gain, fat loss, strength, conditioning, specific muscle groups they want to emphasize)
2. Understand their current fitness level and training experience
3. Learn about any injuries, limitations, or health concerns
4. Find out their available equipment and gym access
5. Learn their schedule and how many days they can train
6. Iteratively refine the plan based on their feedback

When creating a workout plan, structure it clearly with:
- Program overview (duration, split type, goals)
- Each training day with: Day name, focus areas, warmup, exercises with sets/reps/rest
- Progressive overload guidelines
- Nutrition and recovery tips when relevant

IMPORTANT: When the user is satisfied and you have gathered enough information, generate the final plan. When you output the final plan, include it in a special format block like this:

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
      "conditioning": {
        "activity": "Activity name",
        "duration": "30 min",
        "intensity": "Moderate"
      },
      "extras": ["Additional notes"]
    }
  ]
}
\`\`\`

Always be encouraging and explain the reasoning behind your recommendations. Remember their context from the conversation.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
          { role: "system", content: SYSTEM_PROMPT },
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
