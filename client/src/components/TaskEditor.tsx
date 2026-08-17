import { useState } from "react";
import { Modal } from "./Modal";
import { usePlanner } from "../store";
import type { ClassItem, Task } from "../types";

interface Props {
  date: string;
  classItem?: ClassItem | null;
  classes: ClassItem[];
  existing?: Task | null;
  onClose: () => void;
}

export function TaskEditor({ date, classItem, classes, existing, onClose }: Props) {
  const { addTask, updateTask, removeTask } = usePlanner();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [classId, setClassId] = useState<string | null>(existing?.class_id ?? classItem?.id ?? null);
  const [taskDate, setTaskDate] = useState(existing?.date ?? date);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
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
        });
      } else {
        await addTask({ class_id: classId, date: taskDate, title: title.trim(), description: description.trim() });
      }
      onClose();
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
    <Modal title={existing ? "Edit task" : "Add task"} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-300">
          Title
          <input
            autoFocus
            className="rounded-md border border-neutral-300 dark:border-neutral-600 bg-transparent px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
            Date
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
              Cancel
            </button>
            <button
              onClick={save}
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
