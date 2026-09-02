export interface ClassItem {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export type TaskType = "assignment" | "exam";

export interface Task {
  id: string;
  class_id: string | null;
  date: string; // YYYY-MM-DD — the due date
  title: string;
  description: string | null;
  done: 0 | 1;
  source: "manual" | "syllabus";
  type: TaskType;
  created_at: string;
}

export interface Settings {
  semester_start: string;
  semester_end: string;
  [key: string]: string;
}

export interface ExtractedItem {
  date: string;
  title: string;
  description?: string;
  type?: TaskType;
}
