import { useRef, useState } from "react";
import { Modal } from "./Modal";
import { usePlanner } from "../store";
import type { ClassItem, Task, TaskType } from "../types";

interface Props {
  date: string;
  classItem?: ClassItem | null;
  classes: ClassItem[];
  existing?: Task | null;
  initialType?: TaskType;
  onClose: () => void;
}

export function TaskEditor({ date, classItem, classes, existing, initialType, onClose }: Props) {
  const { addTask, updateTask, removeTask } = usePlanner();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [classId, setClassId] = useState<string | null>(existing?.class_id ?? classItem?.id ?? null);
  const [taskDate, setTaskDate] = useState(existing?.date ?? date);
  const [type, setType] = useState<TaskType>(existing?.type ?? initialType ?? "assignment");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const noun = type === "exam" ? "test / midterm" : "assignment";

  const save = async (addAnother = false) => {
    if (!title.trim()) {
      setErr("Title is required");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      if (existing) {
        await updateTask(existing.id, {
          title: title.trim(),
          description: description.trim(),
          class_id: classId,
          date: taskDate,
          type,
        });
        onClose();
      } else {
        await addTask({ class_id: classId, date: taskDate, title: title.trim(), description: description.trim(), type });
        if (addAnother) {
          setJustAdded(title.trim());
          setTitle("");
          setDescription("");
          titleRef.current?.focus();
        } else {
          onClose();
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!existing) return;
    setSaving(true);
    try {
      await removeTask(existing.id);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete");
      setSaving(false);
    }
  };

  return (
    <Modal title={`${existing ? "Edit" : "Add"} ${noun}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex gap-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 p-1 text-sm">
          {(["assignment", "exam"] as TaskType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 rounded px-3 py-1.5 font-medium ${
                type === t
                  ? "bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              {t === "exam" ? "Test / midterm" : "Assignment"}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-300">
          Title
          <input
            autoFocus
            ref={titleRef}
            className="rounded-md border border-neutral-300 dark:border-neutral-600 bg-transparent px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save(false);
              }
            }}
            placeholder="Reading, assignment, exam..."
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-300">
          Details
          <textarea
            className="rounded-md border border-neutral-300 dark:border-neutral-600 bg-transparent px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes"
          />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-300">
            {type === "exam" ? "Date" : "Due date"}
            <input
              type="date"
              className="rounded-md border border-neutral-300 dark:border-neutral-600 bg-transparent px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
              value={taskDate}
              onChange={(e) => setTaskDate(e.target.value)}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-300">
            Class
            <select
              className="rounded-md border border-neutral-300 dark:border-neutral-600 bg-transparent px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
              value={classId ?? ""}
              onChange={(e) => setClassId(e.target.value || null)}
            >
              <option value="">None</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {err && <p className="text-sm text-red-500">{err}</p>}
        {justAdded && !err && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Added “{justAdded}”. Add another below, or close.
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <div>
            {existing && (
              <button
                onClick={del}
                disabled={saving}
                className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {justAdded ? "Done" : "Cancel"}
            </button>
            {!existing && (
              <button
                onClick={() => save(true)}
                disabled={saving}
                className="rounded-md border border-neutral-300 dark:border-neutral-600 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
              >
                Save &amp; add another
              </button>
            )}
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="rounded-md bg-neutral-900 dark:bg-white px-3 py-1.5 text-sm font-medium text-white dark:text-neutral-900 hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
