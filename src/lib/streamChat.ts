export type Message = { role: "user" | "assistant"; content: string };
export type ThreadType = "plan" | "advice" | "general";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fitness-coach`;

export interface ChatContext {
  planName?: string;
  todayLabel?: string;
  todayName?: string;
  todayFocus?: string;
  todayExercises?: Array<{ name: string; sets: number; reps: string; rest: string; notes?: string }>;
  recentLogs?: Array<{ date: string; exercise: string; sets: number; reps: number; weight: number }>;
  monthSummary?: {
    monthLabel: string;
    plannedSessions: number;
    completedSessions: number;
    substitutes: Array<{ date: string; activity: string; durationMin: number; intensity: string; reason?: string; note?: string }>;
    missedDays: Array<{ date: string; reason?: string }>;
    estimatedSubstituteEffortPct: number; // 0-100, vs. a full planned session
    statedGoals?: string[];
  };
  bodyweight?: {
    current: number;
    currentDate: string;
    previous?: number;
    startOfRecord: number;
    changeSinceStart: number;
    history: Array<{ date: string; value: number }>;
  };
  userNotes?: Array<{ date: string; note: string }>;
}

export async function streamChat({
  messages,
  threadType = "advice",
  context,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  threadType?: ThreadType;
  context?: ChatContext;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, threadType, context }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({ error: "Connection failed" }));
      onError(errorData.error || `Error: ${resp.status}`);
      return;
    }

    if (!resp.body) {
      onError("No response stream");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (error) {
    console.error("Stream error:", error);
    onError(error instanceof Error ? error.message : "Connection failed");
  }
}

// Parse the structured workout plan from AI response
export function parseWorkoutPlan(content: string): {
  name: string;
  description: string;
  duration_weeks: number;
  days: any[];
} | null {
  // Preferred format
  const match = content.match(/```WORKOUT_PLAN_JSON\s*([\s\S]*?)(?:```|$)/);
  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch (e) {
      console.error("Failed to parse workout plan:", e);
    }
  }

  // Fallback: sometimes models emit a generic JSON code block.
  // Try parsing any fenced code block and validate shape.
  const blockRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
  for (const m of content.matchAll(blockRegex)) {
    try {
      const parsed = JSON.parse((m[1] || '').trim());
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.name === 'string' &&
        Array.isArray(parsed.days)
      ) {
        return parsed as any;
      }
    } catch {
      // ignore
    }
  }

  return null;
}
