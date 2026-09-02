import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedTask } from "./extract.js";

// Sonnet 5 is the default — strong at structured extraction, ~2¢ per syllabus.
// Override with SYLLABUS_MODEL if you ever want haiku (cheaper) or opus (max).
const MODEL = process.env.SYLLABUS_MODEL || "claude-sonnet-5";

export function aiExtractAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM = `You extract graded work and readings from a college course syllabus.

Return every dated item a student needs to track: readings, homework, problem sets,
essays, projects, presentations, quizzes, tests, midterms, and final exams.

Rules:
- One entry per item. If a single date has several items, emit several entries.
- "type" is "exam" for anything graded as a test (quiz, test, midterm, final, exam,
  in-class assessment); otherwise "assignment".
- Resolve every date to an absolute YYYY-MM-DD. Use the provided term start date to
  pick the year, and to expand ranges/relative dates ("Week 3", "Monday of week 5").
  If an item spans multiple days, use the due date (the last day).
- "title" is a short human label (e.g. "Problem Set 4", "Midterm 1", "Read Ch. 6–7").
- "description" is optional extra detail; omit it if the title already says everything.
- Skip items with no determinable date (office hours, grading policy, general topics).
- Do not invent items. If the syllabus has no dated work, return an empty list.`;

const INPUT_SCHEMA: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "Absolute due date, YYYY-MM-DD" },
          title: { type: "string" },
          description: { type: "string" },
          type: { type: "string", enum: ["assignment", "exam"] },
        },
        required: ["date", "title", "description", "type"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function aiExtractSyllabusItems(
  syllabusText: string,
  opts: { referenceYear: number; referenceMonth?: number }
): Promise<ExtractedTask[]> {
  const client = new Anthropic();

  const termStart = `${opts.referenceYear}-${String(opts.referenceMonth ?? 1).padStart(2, "0")}-01`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `The term starts around ${termStart}. Extract the dated work from this syllabus:\n\n${syllabusText}`,
      },
    ],
    tools: [
      {
        name: "record_items",
        description: "Record the list of dated items extracted from the syllabus.",
        strict: true,
        input_schema: INPUT_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "record_items" },
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "record_items"
  );
  if (!toolUse) throw new Error("Model did not return structured syllabus items");

  const raw = (toolUse.input as { items?: unknown }).items;
  if (!Array.isArray(raw)) throw new Error("Model returned malformed syllabus items");

  const items: ExtractedTask[] = [];
  for (const it of raw) {
    if (!it || typeof it !== "object") continue;
    const { date, title, description, type } = it as Record<string, unknown>;
    if (typeof date !== "string" || !ISO_DATE.test(date)) continue;
    if (typeof title !== "string" || !title.trim()) continue;
    items.push({
      date,
      title: title.trim().slice(0, 200),
      description: typeof description === "string" && description.trim() ? description.trim() : undefined,
      type: type === "exam" ? "exam" : "assignment",
    });
  }
  return items;
}
