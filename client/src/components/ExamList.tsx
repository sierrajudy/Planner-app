import { useMemo, useState } from "react";
import { usePlanner } from "../store";
import { fromISO, formatLong, todayISO } from "../lib/dates";
import { hexWithAlpha } from "./ColorDot";
import { TaskEditor } from "./TaskEditor";
import { useCelebration } from "./Celebration";
import type { ClassItem, Task } from "../types";

export function ExamList() {
  const { classes, tasks, toggleTaskDone } = usePlanner();
  const { celebrate } = useCelebration();
  const [editing, setEditing] = useState<{ task: Task | null } | null>(null);

  const classById = useMemo(() => {
    const map = new Map<string, ClassItem>();
    for (const c of classes) map.set(c.id, c);
    return map;
  }, [classes]);

  const today = todayISO();
  const exams = useMemo(
    () => tasks.filter((t) => t.type === "exam").sort((a, b) => a.date.localeCompare(b.date)),
    [tasks]
  );
  const upcoming = exams.filter((t) => t.date >= today);
  const past = exams.filter((t) => t.date < today);

  const handleToggle = (t: Task) => {
    if (!t.done) celebrate();
    toggleTaskDone(t.id);
  };

  const Row = ({ t }: { t: Task }) => {
    const classItem = t.class_id ? classById.get(t.class_id) ?? null : null;
    return (
      <li
        className={`flex items-start gap-3 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${
          t.done ? "opacity-60" : ""
        }`}
        style={{
          borderLeftColor: classItem?.color ?? "#a3a3a3",
          borderLeftWidth: 3,
          backgroundColor: classItem ? hexWithAlpha(classItem.color, "0d") : undefined,
        }}
        onClick={() => setEditing({ task: t })}
      >
        <input
          type="checkbox"
          checked={!!t.done}
          onChange={(e) => {
            e.stopPropagation();
            handleToggle(t);
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
          </div>
          <p
            className={`text-sm ${
              t.done ? "line-through text-neutral-400 dark:text-neutral-500" : "text-neutral-800 dark:text-neutral-200"
            }`}
          >
            {t.title}
          </p>
          {t.description && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-pre-wrap">{t.description}</p>
          )}
        </div>
        <span className="shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400 text-right">
          {formatLong(fromISO(t.date))}
        </span>
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Tests &amp; Midterms</h2>
        <button
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          onClick={() => setEditing({ task: null })}
        >
          + Add test / midterm
        </button>
      </div>

      {exams.length === 0 && (
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          No tests or midterms yet. Add one, or mark an assignment as a test / midterm in its editor.
        </p>
      )}

      {upcoming.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-2">
            Upcoming ({upcoming.length})
          </h3>
          <ul className="flex flex-col gap-1.5">
            {upcoming.map((t) => (
              <Row key={t.id} t={t} />
            ))}
          </ul>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-2">
            Past ({past.length})
          </h3>
          <ul className="flex flex-col gap-1.5">
            {past.map((t) => (
              <Row key={t.id} t={t} />
            ))}
          </ul>
        </div>
      )}

      {editing && (
        <TaskEditor
          date={todayISO()}
          classItem={editing.task?.class_id ? classById.get(editing.task.class_id) ?? null : null}
          classes={classes}
          existing={editing.task}
          initialType="exam"
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
