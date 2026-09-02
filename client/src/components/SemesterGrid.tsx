import { useMemo, useState } from "react";
import { usePlanner } from "../store";
import { formatShort, rangeDates, toISO, todayISO } from "../lib/dates";
import { hexWithAlpha } from "./ColorDot";
import { TaskEditor } from "./TaskEditor";
import { useCelebration } from "./Celebration";
import type { ClassItem, Task } from "../types";

export function SemesterGrid() {
  const { classes, tasks, settings, toggleTaskDone } = usePlanner();
  const { celebrate } = useCelebration();
  const [editing, setEditing] = useState<{ date: string; classItem: ClassItem | null; task: Task | null } | null>(
    null
  );

  const days = useMemo(() => {
    if (!settings) return [];
    return rangeDates(settings.semester_start, settings.semester_end);
  }, [settings]);

  const tasksByCell = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const key = `${t.date}::${t.class_id ?? ""}`;
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
    }
    return map;
  }, [tasks]);

  const today = todayISO();

  if (!settings) return null;

  if (classes.length === 0) {
    return (
      <div className="p-10 text-center text-neutral-500 dark:text-neutral-400">
        Add a class to start building your semester grid.
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="border-collapse w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="sticky left-0 z-20 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left font-medium text-neutral-500 min-w-[90px]">
              Date
            </th>
            {classes.map((c) => (
              <th
                key={c.id}
                className="border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-left font-medium min-w-[190px]"
                style={{ backgroundColor: hexWithAlpha(c.color, "22") }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.name}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const iso = toISO(day);
            const isToday = iso === today;
            return (
              <tr key={iso} className={isToday ? "bg-amber-50 dark:bg-amber-950/30" : undefined}>
                <td
                  className={`sticky left-0 z-10 border border-neutral-200 dark:border-neutral-700 px-3 py-2 whitespace-nowrap font-medium ${
                    isToday
                      ? "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200"
                      : "bg-neutral-50 dark:bg-neutral-900 text-neutral-500"
                  }`}
                >
                  {formatShort(day)}
                </td>
                {classes.map((c) => {
                  const cellTasks = tasksByCell.get(`${iso}::${c.id}`) ?? [];
                  return (
                    <td
                      key={c.id}
                      className="border border-neutral-200 dark:border-neutral-700 px-2 py-1.5 align-top cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                      onClick={() => setEditing({ date: iso, classItem: c, task: null })}
                    >
                      <div className="flex flex-col gap-1">
                        {cellTasks.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-start gap-1.5 group"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing({ date: iso, classItem: c, task: t });
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={!!t.done}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (!t.done) celebrate();
                                toggleTaskDone(t.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-0.5 shrink-0"
                            />
                            <span
                              className={`text-xs leading-snug ${
                                t.done
                                  ? "line-through text-neutral-400 dark:text-neutral-500"
                                  : "text-neutral-800 dark:text-neutral-200"
                              }`}
                            >
                              {t.type === "exam" && (
                                <span className="mr-1 rounded bg-red-100 px-1 text-[9px] font-semibold uppercase text-red-700 dark:bg-red-950 dark:text-red-300">
                                  Test
                                </span>
                              )}
                              {t.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

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
