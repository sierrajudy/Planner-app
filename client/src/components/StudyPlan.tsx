import { useMemo, useState } from "react";
import { usePlanner } from "../store";
import { api } from "../lib/api";
import { formatLong, fromISO, relativeDateLabel, todayISO } from "../lib/dates";
import { hexWithAlpha } from "./ColorDot";
import { TaskEditor } from "./TaskEditor";
import { useCelebration } from "./Celebration";
import type { ClassItem, SchedulePlan, Task } from "../types";

const STORAGE_KEY = "planner.studyPlan.v1";

interface Stored {
  signature: string;
  generatedAt: string;
  plan: SchedulePlan;
}

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Stored;
  } catch {
    return null;
  }
}

function saveStored(v: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    // ignore (private browsing, quota, etc.)
  }
}

function signatureFor(tasks: Task[]): string {
  return tasks
    .filter((t) => !t.done)
    .map((t) => `${t.id}:${t.date}`)
    .sort()
    .join("|");
}

export function StudyPlan() {
  const { classes, tasks, toggleTaskDone } = usePlanner();
  const { celebrate } = useCelebration();
  const [stored, setStored] = useState<Stored | null>(() => loadStored());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ date: string; classItem: ClassItem | null; task: Task | null } | null>(
    null
  );

  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const currentSignature = useMemo(() => signatureFor(tasks), [tasks]);
  const stale = stored ? stored.signature !== currentSignature : false;

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const plan = await api.recommendSchedule();
      const next: Stored = { signature: currentSignature, generatedAt: new Date().toISOString(), plan };
      setStored(next);
      saveStored(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate a study plan");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (t: Task) => {
    if (!t.done) celebrate();
    toggleTaskDone(t.id);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 flex flex-col gap-5">
      <div>
        <h2 className="text-base font-semibold">Study Plan</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Claude looks at what you have due and suggests what to work on, and when, so nothing gets crammed at
          the last minute.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-md bg-neutral-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Thinking…" : stored ? "Regenerate plan" : "Generate my study plan"}
        </button>
        {stored && !loading && (
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            Generated {new Date(stored.generatedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {stale && !loading && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Your assignments have changed since this plan was made — regenerate for up-to-date advice.
        </p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {stored && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-700 dark:text-neutral-300 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3">
            {stored.plan.overall_advice}
          </p>

          {stored.plan.days.length === 0 ? (
            <p className="text-sm text-neutral-400 dark:text-neutral-500">Nothing to schedule right now.</p>
          ) : (
            stored.plan.days.map((day) => {
              const iso = day.date;
              const isToday = iso === todayISO();
              const relative = relativeDateLabel(iso);
              const showRelative = relative === "Today" || relative === "Tomorrow";
              return (
                <div key={iso}>
                  <h3
                    className={`text-sm font-semibold mb-2 ${
                      isToday ? "text-amber-600 dark:text-amber-400" : "text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {formatLong(fromISO(iso))}
                    {showRelative ? ` · ${relative}` : ""}
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {day.items.map((item, idx) => {
                      const task = taskById.get(item.task_id);
                      if (!task) return null;
                      const c = task.class_id ? classById.get(task.class_id) ?? null : null;
                      return (
                        <li
                          key={`${item.task_id}-${idx}`}
                          onClick={() => setEditing({ date: task.date, classItem: c, task })}
                          className="flex items-start gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                          style={{
                            borderLeftColor: c?.color ?? "#a3a3a3",
                            borderLeftWidth: 3,
                            backgroundColor: c ? hexWithAlpha(c.color, "0d") : undefined,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!task.done}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggle(task);
                            }}
                            className="mt-1 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {c && (
                                <span
                                  className="inline-block w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: c.color }}
                                />
                              )}
                              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                {c?.name ?? "Unassigned"}
                              </span>
                              {task.type === "exam" && (
                                <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-950 dark:text-red-300">
                                  Test
                                </span>
                              )}
                              <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-auto shrink-0">
                                due {relativeDateLabel(task.date)}
                              </span>
                            </div>
                            <p
                              className={`text-sm ${
                                task.done
                                  ? "line-through text-neutral-400 dark:text-neutral-500"
                                  : "text-neutral-800 dark:text-neutral-200"
                              }`}
                            >
                              {task.title}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 italic">{item.note}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      )}

      {!stored && !loading && !error && (
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          No plan yet — click the button above. This makes one API call to Claude each time you generate or
          regenerate.
        </p>
      )}

      {editing && (
        <TaskEditor
          date={editing.date}
          classItem={editing.classItem}
          classes={classes}
          existing={editing.task}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
