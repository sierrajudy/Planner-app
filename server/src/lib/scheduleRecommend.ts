import Anthropic from "@anthropic-ai/sdk";

// Same default as the syllabus reader — good at reasoning over structured
// lists, cheap enough to regenerate on demand. Override with SCHEDULE_MODEL.
const MODEL = process.env.SCHEDULE_MODEL || "claude-sonnet-5";

export function scheduleAiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface ScheduleTaskInput {
  id: string;
  title: string;
  description?: string | null;
  class_name: string | null;
  type: "assignment" | "exam";
  date: string; // due date, YYYY-MM-DD
}

export interface ScheduleDay {
  date: string;
  items: Array<{ task_id: string; note: string }>;
}

export interface ScheduleRecommendation {
  overall_advice: string;
  days: ScheduleDay[];
}

const SYSTEM = `You are a study-planning assistant for a college student using a
homework planner app. You are given their full list of outstanding assignments
and tests, each with an id, title, class, type, and due date. Today's date is
also given.

Build a day-by-day plan for what to work on and when, so nothing gets crammed
at the last minute and nothing is missed.

Rules:
- Never schedule a task on or after its due date — always finish it before.
- Overdue tasks go on today's date first, called out clearly.
- Exams deserve multiple study sessions spread across the days before them
  (e.g. a first pass a week out, practice problems a few days out, a final
  review the day before) rather than one big cram day — split these across
  several days as separate entries for the same task_id, each with a
  different "note" describing what to do in that session.
- Small/quick assignments can be a single entry close to their due date if
  there's no reason to start earlier.
- Spread the workload reasonably across days — avoid piling everything onto
  one day when earlier days are empty, and avoid scheduling on days with
  nothing due if it doesn't help.
- Only use task ids from the provided list. Never invent tasks or ids.
- "note" is a short (under ~12 words), specific action for that session, e.g.
  "Outline the essay" or "Practice problem sets 3-4" or "Final review before
  the exam" — not a restatement of the title.
- "overall_advice" is 2-3 encouraging, concrete sentences: what to prioritize
  first and why, in plain language a student would actually read.
- Only include days that have at least one item. Order days chronologically.
- If the task list is empty, return an empty "days" array and advice
  congratulating them on being caught up.`;

const INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    overall_advice: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task_id: { type: "string" },
                note: { type: "string" },
              },
              required: ["task_id", "note"],
              additionalProperties: false,
            },
          },
        },
        required: ["date", "items"],
        additionalProperties: false,
      },
    },
  },
  required: ["overall_advice", "days"],
  additionalProperties: false,
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function recommendSchedule(
  tasks: ScheduleTaskInput[],
  today: string
): Promise<ScheduleRecommendation> {
  if (tasks.length === 0) {
    return { overall_advice: "Nothing outstanding — you're all caught up. Enjoy the break! 🎉", days: [] };
  }

  const client = new Anthropic();
  const validIds = new Set(tasks.map((t) => t.id));

  const taskLines = tasks
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(
      (t) =>
        `- id: ${t.id} | ${t.type === "exam" ? "EXAM" : "assignment"} | "${t.title}"${
          t.description ? ` — ${t.description}` : ""
        } | class: ${t.class_name ?? "unassigned"} | due: ${t.date}`
    )
    .join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Today is ${today}. Here is the full outstanding task list:\n\n${taskLines}`,
      },
    ],
    tools: [
      {
        name: "record_plan",
        description: "Record the recommended day-by-day study plan.",
        strict: true,
        input_schema: INPUT_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "record_plan" },
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "record_plan"
  );
  if (!toolUse) throw new Error("Model did not return a structured plan");

  const raw = toolUse.input as { overall_advice?: unknown; days?: unknown };
  const advice = typeof raw.overall_advice === "string" ? raw.overall_advice : "";
  const rawDays = Array.isArray(raw.days) ? raw.days : [];

  const days: ScheduleDay[] = [];
  for (const d of rawDays) {
    if (!d || typeof d !== "object") continue;
    const { date, items } = d as Record<string, unknown>;
    if (typeof date !== "string" || !ISO_DATE.test(date)) continue;
    if (!Array.isArray(items)) continue;
    const cleanItems = items
      .filter(
        (i): i is { task_id: string; note: string } =>
          !!i &&
          typeof i === "object" &&
          typeof (i as Record<string, unknown>).task_id === "string" &&
          validIds.has((i as Record<string, unknown>).task_id as string) &&
          typeof (i as Record<string, unknown>).note === "string"
      )
      .map((i) => ({ task_id: i.task_id, note: i.note.trim().slice(0, 200) }));
    if (cleanItems.length > 0) days.push({ date, items: cleanItems });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));

  return { overall_advice: advice.trim().slice(0, 1000), days };
}
