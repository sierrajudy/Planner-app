import { useMemo, useState } from "react";
import { usePlanner } from "../store";
import { formatLong, rangeDates, toISO, todayISO, weekRange } from "../lib/dates";
import { hexWithAlpha } from "./ColorDot";
import { TaskEditor } from "./TaskEditor";
import { useCelebration } from "./Celebration";
import type { ClassItem, Task } from "../types";

export function AgendaView({ mode }: { mode: "today" | "week" }) {
  const { classes, tasks, toggleTaskDone } = usePlanner();
  const { celebrate } = useCelebration();
  const [editing, setEditing] = useState<{ date: string; classItem: ClassItem | null; task: Task | null } | null>(
    null
  );

  const days = useMemo(() => {
    const now = new Date();
    if (mode === "today") return [now];
    const { start, end } = weekRange(now);
    return rangeDates(toISO(start), toISO(end));
  }, [mode]);

  const classById = useMemo(() => {
    const map = new Map<string, ClassItem>();
    for (const c of classes) map.set(c.id, c);
    return map;
  }, [classes]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.class_id ?? "").localeCompare(b.class_id ?? ""));
    }
    return map;
  }, [tasks]);

  const today = todayISO();

  const handleToggle = (t: Task) => {
    if (!t.done) celebrate();
    toggleTaskDone(t.id);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 flex flex-col gap-6">
      {days.map((day) => {
        const iso = toISO(day);
        const dayTasks = tasksByDate.get(iso) ?? [];
        const activeTasks = dayTasks.filter((t) => !t.done);
        const completedTasks = dayTasks.filter((t) => t.done);
        const isToday = iso === today;
        return (
          <div key={iso}>
            <div className="flex items-center gap-2 mb-2">
              <h3
                className={`text-sm font-semibold ${
                  isToday ? "text-amber-600 dark:text-amber-400" : "text-neutral-700 dark:text-neutral-300"
                }`}
              >
                {formatLong(day)}
                {isToday ? " · Today" : ""}
              </h3>
              <button
                className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 ml-auto"
                onClick={() => setEditing({ date: iso, classItem: null, task: null })}
              >
                + Add assignment
              </button>
            </div>

            {dayTasks.length === 0 ? (
              <p className="text-sm text-neutral-400 dark:text-neutral-500">Nothing scheduled.</p>
            ) : (
              <>
                {activeTasks.length > 0 ? (
                  <ul className="flex flex-col gap-1.5">
                    {activeTasks.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        classItem={t.class_id ? classById.get(t.class_id) ?? null : null}
                        onToggle={() => handleToggle(t)}
                        onOpen={() => setEditing({ date: iso, classItem: t.class_id ? classById.get(t.class_id) ?? null : null, task: t })}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-neutral-400 dark:text-neutral-500">All done for this day. 🎉</p>
                )}

                {completedTasks.length > 0 && (
                  <details className="mt-3 group" open>
                    <summary className="text-xs font-medium text-neutral-400 dark:text-neutral-500 cursor-pointer select-none list-none flex items-center gap-1">
                      <span className="inline-block transition-transform group-open:rotate-90">›</span>
                      Completed ({completedTasks.length})
                    </summary>
                    <ul className="flex flex-col gap-1.5 mt-2">
                      {completedTasks.map((t) => (
                        <TaskRow
                          key={t.id}
                          task={t}
                          classItem={t.class_id ? classById.get(t.class_id) ?? null : null}
                          onToggle={() => handleToggle(t)}
                          onOpen={() => setEditing({ date: iso, classItem: t.class_id ? classById.get(t.class_id) ?? null : null, task: t })}
                        />
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
          </div>
        );
      })}

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

function TaskRow({
  task,
  classItem,
  onToggle,
  onOpen,
}: {
  task: Task;
  classItem: ClassItem | null;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <li
      className={`flex items-start gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${
        task.done ? "opacity-60" : ""
      }`}
      style={{
        borderLeftColor: classItem?.color ?? "#a3a3a3",
        borderLeftWidth: 3,
        backgroundColor: classItem ? hexWithAlpha(classItem.color, "0d") : undefined,
      }}
      onClick={onOpen}
    >
      <input
        type="checkbox"
        checked={!!task.done}
        onChange={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        onClick={(e) => e.stopPropagation()}
        className="mt-1 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {classItem && (
            <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: classItem.color }} />
          )}
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {classItem?.name ?? "Unassigned"}
          </span>
          {task.type === "exam" && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-950 dark:text-red-300">
              Test
            </span>
          )}
        </div>
        <p
          className={`text-sm ${
            task.done ? "line-through text-neutral-400 dark:text-neutral-500" : "text-neutral-800 dark:text-neutral-200"
          }`}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-pre-wrap">{task.description}</p>
        )}
      </div>
    </li>
  );
}
