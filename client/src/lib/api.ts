import type { ClassItem, ExtractedItem, Settings, Task } from "../types";

const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: options?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getClasses: () => request<ClassItem[]>("/classes"),
  createClass: (data: { name: string; color?: string }) =>
    request<ClassItem>("/classes", { method: "POST", body: JSON.stringify(data) }),
  updateClass: (id: string, data: Partial<Pick<ClassItem, "name" | "color" | "sort_order">>) =>
    request<ClassItem>(`/classes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteClass: (id: string) => request<void>(`/classes/${id}`, { method: "DELETE" }),

  getTasks: (range?: { start: string; end: string }) =>
    request<Task[]>(`/tasks${range ? `?start=${range.start}&end=${range.end}` : ""}`),
  createTask: (data: {
    class_id?: string | null;
    date: string;
    title: string;
    description?: string;
  }) => request<Task>("/tasks", { method: "POST", body: JSON.stringify(data) }),
  bulkCreateTasks: (
    tasks: Array<{ class_id?: string | null; date: string; title: string; description?: string; source?: string }>
  ) => request<Task[]>("/tasks/bulk", { method: "POST", body: JSON.stringify({ tasks }) }),
  updateTask: (
    id: string,
    data: Partial<{ class_id: string | null; date: string; title: string; description: string; done: boolean }>
  ) => request<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" }),

  getSettings: () => request<Settings>("/settings"),
  updateSettings: (data: Partial<Settings>) =>
    request<Settings>("/settings", { method: "PATCH", body: JSON.stringify(data) }),

  parseSyllabus: async (file: File, referenceYear: number, referenceMonth?: number) => {
    const form = new FormData();
    form.append("file", file);
    form.append("referenceYear", String(referenceYear));
    if (referenceMonth) form.append("referenceMonth", String(referenceMonth));
    return request<{ items: ExtractedItem[] }>("/syllabus/parse", {
      method: "POST",
      body: form,
    });
  },
};
