import { useMemo, useState } from "react";
import { usePlanner } from "../store";
import { formatShort, fromISO, relativeDateLabel, todayISO } from "../lib/dates";
import { CLASS_COLORS, hexWithAlpha } from "./ColorDot";
import { TaskEditor } from "./TaskEditor";
import { SyllabusUpload } from "./SyllabusUpload";
import { useCelebration } from "./Celebration";
import type { ClassItem, Task } from "../types";

export function Dashboard() {
  const { classes, tasks, addClass, renameClass, recolorClass, toggleTaskDone } = usePlanner();
  const { celebrate } = useCelebration();
  const [editing, setEditing] = useState<{ date: string; classItem: ClassItem | null; task: Task | null } | null>(
    null
  );
  const [uploadFor, setUploadFor] = useState<ClassItem | null>(null);
  const [addingClass, setAddingClass] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const today = todayISO();

  const upcomingByClass = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (t.done) continue;
      const key = t.class_id ?? "";
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.date.localeCompare(b.date));
    return map;
  }, [tasks]);

  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);

  const todo = useMemo(
    () => tasks.filter((t) => !t.done).sort((a, b) => a.date.localeCompare(b.date)),
    [tasks]
  );

  const handleToggle = (t: Task) => {
    if (!t.done) celebrate();
    toggleTaskDone(t.id);
  };

  const createClass = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await addClass(newName.trim());
      setNewName("");
      setAddingClass(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 flex flex-col lg:flex-row gap-8">
      {/* Course cards */}
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold mb-3">Your classes</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {classes.map((c) => {
            const upcoming = upcomingByClass.get(c.id) ?? [];
            const next = upcoming[0];
            const examCount = upcoming.filter((t) => t.type === "exam").length;
            return (
              <div key={c.id} className="rounded-lg border border-neutral-200 dark:border-neutral-700 flex flex-col">
                <div className="h-2 rounded-t-lg shrink-0" style={{ backgroundColor: c.color }} />
                <div className="p-3 flex flex-col gap-1.5 flex-1">
                  <input
                    className="font-medium text-sm bg-transparent outline-none min-w-0 text-neutral-900 dark:text-neutral-100"
                    defaultValue={c.name}
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value !== c.name) renameClass(c.id, e.target.value.trim());
                    }}
                  />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {upcoming.length === 0
                      ? "Nothing upcoming"
                      : `${upcoming.length} upcoming${examCount ? ` · ${examCount} test${examCount > 1 ? "s" : ""}` : ""}`}
                  </p>
                  {next && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 truncate">
                      Next: {next.title} · {formatShort(fromISO(next.date))}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="relative group">
                      <button
                        className="w-4 h-4 rounded-full ring-1 ring-black/10 cursor-pointer"
                        style={{ backgroundColor: c.color }}
                        aria-label="Change color"
                      />
                      <div className="hidden group-hover:flex absolute z-10 bottom-6 left-0 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md p-1.5 gap-1 flex-wrap w-[132px] shadow-lg">
                        {CLASS_COLORS.map((sw) => (
                          <button
                            key={sw}
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: sw }}
                            onClick={() => recolorClass(c.id, sw)}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 whitespace-nowrap"
                      onClick={() => setUploadFor(c)}
                    >
                      📄 Import
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center p-3 min-h-[112px]">
            {addingClass ? (
              <div className="flex flex-col gap-2 w-full">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createClass();
                    if (e.key === "Escape") {
                      setAddingClass(false);
                      setNewName("");
                    }
                  }}
                  placeholder="Class name"
                  className="rounded-md border border-neutral-300 dark:border-neutral-600 bg-transparent px-2 py-1 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={createClass}
                    disabled={busy || !newName.trim()}
                    className="rounded-md bg-neutral-900 dark:bg-white px-2 py-1 text-xs font-medium text-white dark:text-neutral-900 hover:opacity-90 disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setAddingClass(false);
                      setNewName("");
                    }}
                    className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingClass(true)}
                className="text-sm text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                + New class
              </button>
            )}
          </div>
        </div>
      </div>

      {/* To Do sidebar */}
      <div className="w-full lg:w-80 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">To Do</h2>
          <button
            className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            onClick={() => setEditing({ date: today, classItem: null, task: null })}
          >
            + Add
          </button>
        </div>
        {todo.length === 0 ? (
          <p className="text-sm text-neutral-400 dark:text-neutral-500">Nothing due — you're all caught up 🎉</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {todo.map((t) => {
              const c = t.class_id ? classById.get(t.class_id) ?? null : null;
              const overdue = t.date < today;
              return (
                <li
                  key={t.id}
                  onClick={() => setEditing({ date: t.date, classItem: c, task: t })}
                  className="flex items-start gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                  style={{
                    borderLeftColor: c?.color ?? "#a3a3a3",
                    borderLeftWidth: 3,
                    backgroundColor: c ? hexWithAlpha(c.color, "0d") : undefined,
                  }}
                >
                  <input
                    type="checkbox"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggle(t);
                    }}
                    className="mt-1 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {c && <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />}
                      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate">
                        {c?.name ?? "Unassigned"}
                      </span>
                      {t.type === "exam" && (
                        <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:bg-red-950 dark:text-red-300">
                          Test
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-800 dark:text-neutral-200">{t.title}</p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-medium ${
                      overdue ? "text-red-500 dark:text-red-400" : "text-neutral-400 dark:text-neutral-500"
                    }`}
                  >
                    {overdue ? "Overdue" : relativeDateLabel(t.date)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing && (
        <TaskEditor
          date={editing.date}
          classItem={editing.classItem}
          classes={classes}
          existing={editing.task}
          onClose={() => setEditing(null)}
        />
      )}
      {uploadFor && <SyllabusUpload classItem={uploadFor} onClose={() => setUploadFor(null)} />}
    </div>
  );
}
