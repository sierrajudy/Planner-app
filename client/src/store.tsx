import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./lib/api";
import type { ClassItem, Settings, Task } from "./types";

interface PlannerState {
  classes: ClassItem[];
  tasks: Task[];
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addClass: (name: string) => Promise<ClassItem>;
  renameClass: (id: string, name: string) => Promise<void>;
  recolorClass: (id: string, color: string) => Promise<void>;
  removeClass: (id: string) => Promise<void>;
  addTask: (data: { class_id?: string | null; date: string; title: string; description?: string }) => Promise<void>;
  bulkAddTasks: (
    tasks: Array<{ class_id?: string | null; date: string; title: string; description?: string; source?: string }>
  ) => Promise<void>;
  updateTask: (
    id: string,
    data: Partial<{ class_id: string | null; date: string; title: string; description: string; done: boolean }>
  ) => Promise<void>;
  toggleTaskDone: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  updateSettings: (data: Partial<Settings>) => Promise<void>;
}

const PlannerContext = createContext<PlannerState | null>(null);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [c, t, s] = await Promise.all([api.getClasses(), api.getTasks(), api.getSettings()]);
      setClasses(c);
      setTasks(t);
      setSettings(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load planner data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addClass = useCallback(async (name: string) => {
    const created = await api.createClass({ name });
    setClasses((prev) => [...prev, created]);
    return created;
  }, []);

  const renameClass = useCallback(async (id: string, name: string) => {
    const updated = await api.updateClass(id, { name });
    setClasses((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, []);

  const recolorClass = useCallback(async (id: string, color: string) => {
    const updated = await api.updateClass(id, { color });
    setClasses((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, []);

  const removeClass = useCallback(async (id: string) => {
    await api.deleteClass(id);
    setClasses((prev) => prev.filter((c) => c.id !== id));
    setTasks((prev) => prev.filter((t) => t.class_id !== id));
  }, []);

  const addTask = useCallback(
    async (data: { class_id?: string | null; date: string; title: string; description?: string }) => {
      const created = await api.createTask(data);
      setTasks((prev) => [...prev, created]);
    },
    []
  );

  const bulkAddTasks = useCallback(
    async (
      newTasks: Array<{ class_id?: string | null; date: string; title: string; description?: string; source?: string }>
    ) => {
      const created = await api.bulkCreateTasks(newTasks);
      setTasks((prev) => [...prev, ...created]);
    },
    []
  );

  const updateTask = useCallback(
    async (
      id: string,
      data: Partial<{ class_id: string | null; date: string; title: string; description: string; done: boolean }>
    ) => {
      const updated = await api.updateTask(id, data);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    },
    []
  );

  const toggleTaskDone = useCallback(
    async (id: string) => {
      const existing = tasks.find((t) => t.id === id);
      if (!existing) return;
      const updated = await api.updateTask(id, { done: !existing.done });
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    },
    [tasks]
  );

  const removeTask = useCallback(async (id: string) => {
    await api.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateSettings = useCallback(async (data: Partial<Settings>) => {
    const updated = await api.updateSettings(data);
    setSettings(updated);
  }, []);

  const value = useMemo<PlannerState>(
    () => ({
      classes,
      tasks,
      settings,
      loading,
      error,
      reload,
      addClass,
      renameClass,
      recolorClass,
      removeClass,
      addTask,
      bulkAddTasks,
      updateTask,
      toggleTaskDone,
      removeTask,
      updateSettings,
    }),
    [
      classes,
      tasks,
      settings,
      loading,
      error,
      reload,
      addClass,
      renameClass,
      recolorClass,
      removeClass,
      addTask,
      bulkAddTasks,
      updateTask,
      toggleTaskDone,
      removeTask,
      updateSettings,
    ]
  );

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner(): PlannerState {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error("usePlanner must be used within PlannerProvider");
  return ctx;
}
