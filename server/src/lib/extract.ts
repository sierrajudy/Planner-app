export interface ExtractedTask {
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  type: "assignment" | "exam";
}

const EXAM_KEYWORDS = /\b(exam|midterm|mid-term|final|finals|test|quiz|assessment)\b/i;

function classify(text: string): "assignment" | "exam" {
  return EXAM_KEYWORDS.test(text) ? "exam" : "assignment";
}

const MONTH_INDEX: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const MONTH_NAME_DATE =
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/i;

const SLASH_DATE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;

interface DateMatch {
  month: number;
  day: number;
  year?: number;
  index: number;
  length: number;
}

function findDate(line: string): DateMatch | null {
  const monthMatch = line.match(MONTH_NAME_DATE);
  if (monthMatch && monthMatch.index !== undefined) {
    const month = MONTH_INDEX[monthMatch[1].toLowerCase()];
    const day = Number(monthMatch[2]);
    const year = monthMatch[3] ? Number(monthMatch[3]) : undefined;
    if (month && day >= 1 && day <= 31) {
      return { month, day, year, index: monthMatch.index, length: monthMatch[0].length };
    }
  }
  const slashMatch = line.match(SLASH_DATE);
  if (slashMatch && slashMatch.index !== undefined) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    let year: number | undefined;
    if (slashMatch[3]) {
      year = Number(slashMatch[3]);
      if (year < 100) year += 2000;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { month, day, year, index: slashMatch.index, length: slashMatch[0].length };
    }
  }
  return null;
}

function toISO(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function extractSyllabusItems(
  syllabusText: string,
  opts: { referenceYear: number; referenceMonth?: number }
): ExtractedTask[] {
  const lines = syllabusText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: ExtractedTask[] = [];
  let currentYear = opts.referenceYear;
  let lastMonth = opts.referenceMonth ?? null;

  let pending: { year: number; month: number; day: number; lines: string[] } | null = null;

  const flush = () => {
    if (pending && pending.lines.length > 0) {
      const text = pending.lines.join(" ").replace(/\s+/g, " ").trim();
      if (text) {
        items.push({
          date: toISO(pending.year, pending.month, pending.day),
          title: text.length > 120 ? `${text.slice(0, 117)}...` : text,
          description: text.length > 120 ? text : undefined,
          type: classify(text),
        });
      }
    }
    pending = null;
  };

  const resolveYear = (month: number, explicitYear?: number) => {
    if (explicitYear) {
      lastMonth = month;
      return explicitYear;
    }
    if (lastMonth !== null && month < lastMonth - 6) {
      currentYear += 1;
    }
    lastMonth = month;
    return currentYear;
  };

  for (const line of lines) {
    const match = findDate(line);
    if (match) {
      flush();
      const year = resolveYear(match.month, match.year);
      const remainder = (line.slice(0, match.index) + line.slice(match.index + match.length))
        .replace(/\s+/g, " ")
        .replace(/^[\s:.\-–—,]+/, "")
        .replace(/[\s:.\-–—,]+$/, "")
        .trim();

      if (remainder.length > 2) {
        items.push({
          date: toISO(year, match.month, match.day),
          title: remainder.length > 120 ? `${remainder.slice(0, 117)}...` : remainder,
          description: remainder.length > 120 ? remainder : undefined,
          type: classify(remainder),
        });
      } else {
        pending = { year, month: match.month, day: match.day, lines: [] };
      }
    } else if (pending && pending.lines.length < 8) {
      pending.lines.push(line);
    }
  }
  flush();

  return items;
}
