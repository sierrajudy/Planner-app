import { useMemo, useState } from "react";
import { usePlanner } from "../store";
import { addMonths, formatLong, formatMonthYear, fromISO, isSameMonth, monthGridDays, toISO, todayISO } from "../lib/dates";
import { hexWithAlpha } from "./ColorDot";
import { TaskEditor } from "./TaskEditor";
import { useCelebration } from "./Celebration";
import type { ClassItem, Task } from "../types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarMonth() {
  const { classes, tasks, toggleTaskDone } = usePlanner();
  const { celebrate } = useCelebration();
  const today = todayISO();
  const [anchor, setAnchor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(today);
  const [editing, setEditing] = useState<{ date: string; classItem: ClassItem | null; task: Task | null } | null>(
    null
  );

  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const days = useMemo(() => monthGridDays(anchor), [anchor]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    return map;
  }, [tasks]);

  const selectedTasks = selectedDay ? tasksByDate.get(selectedDay) ?? [] : [];

  const handleToggle = (t: Task) => {
    if (!t.done) celebrate();
    toggleTaskDone(t.id);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnchor((a) => addMonths(a, -1))}
            className="rounded-md w-7 h-7 flex items-center justify-center text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Previous month"
          >
            ‹
          </button>
          <h2 className="text-base font-semibold w-40 text-center">{formatMonthYear(anchor)}</h2>
          <button
            onClick={() => setAnchor((a) => addMonths(a, 1))}
            className="rounded-md w-7 h-7 flex items-center justify-center text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
        <button
          onClick={() => {
            setAnchor(new Date());
            setSelectedDay(today);
          }}
          className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden text-xs">
        {WEEKDAY_LABELS.map((d) => (
          <div
            key={d}
            className="bg-neutral-50 dark:bg-neutral-900 px-2 py-1.5 text-center font-medium text-neutral-500 dark:text-neutral-400"
          >
            {d}
          </div>
        ))}
        {days.map((day) => {
          const iso = toISO(day);
          const dayTasks = tasksByDate.get(iso) ?? [];
          const inMonth = isSameMonth(day, anchor);
          const isToday = iso === today;
          const isSelected = iso === selectedDay;
          const shown = dayTasks.slice(0, 3);
          const extra = dayTasks.length - shown.length;
          return (
            <button
              key={iso}
              onClick={() => setSelectedDay(iso)}
              className={`bg-white dark:bg-neutral-950 min-h-[76px] p-1.5 text-left flex flex-col gap-1 ${
                inMonth ? "" : "opacity-40"
              } ${isSelected ? "ring-2 ring-inset ring-neutral-900 dark:ring-white" : ""}`}
            >
              <span
                className={
                  isToday
                    ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-semibold"
                    : "text-[11px] text-neutral-500 dark:text-neutral-400"
                }
              >
                {day.getDate()}
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                {shown.map((t) => {
                  const c = t.class_id ? classById.get(t.class_id) : null;
                  return (
                    <span key={t.id} className="flex items-center gap-1 min-w-0">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: c?.color ?? "#a3a3a3" }}
                      />
                      <span
                        className={`truncate text-[10px] ${
                          t.done ? "line-through text-neutral-400" : "text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        {t.title}
                      </span>
                    </span>
                  );
                })}
                {extra > 0 && <span className="text-[10px] text-neutral-400">+{extra} more</span>}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">{formatLong(fromISO(selectedDay))}</h3>
            <button
              className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
              onClick={() => setEditing({ date: selectedDay, classItem: null, task: null })}
            >
              + Add
            </button>
          </div>
          {selectedTasks.length === 0 ? (
            <p className="text-sm text-neutral-400 dark:text-neutral-500">Nothing scheduled.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {selectedTasks.map((t) => {
                const c = t.class_id ? classById.get(t.class_id) ?? null : null;
                return (
                  <li
                    key={t.id}
                    onClick={() => setEditing({ date: selectedDay, classItem: c, task: t })}
                    className="flex items-start gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                    style={{
                      borderLeftColor: c?.color ?? "#a3a3a3",
                      borderLeftWidth: 3,
                      backgroundColor: c ? hexWithAlpha(c.color, "0d") : undefined,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!t.done}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggle(t);
                      }}
                      className="mt-1 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {c && (
                          <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        )}
                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                          {c?.name ?? "Unassigned"}
                        </span>
                        {t.type === "exam" && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-950 dark:text-red-300">
                            Test
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm ${
                          t.done ? "line-through text-neutral-400 dark:text-neutral-500" : "text-neutral-800 dark:text-neutral-200"
                        }`}
                      >
                        {t.title}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
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
