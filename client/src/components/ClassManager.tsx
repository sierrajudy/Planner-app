import { useState } from "react";
import { Modal } from "./Modal";
import { usePlanner } from "../store";
import { SyllabusUpload } from "./SyllabusUpload";
import { CLASS_COLORS as SWATCHES } from "./ColorDot";
import type { ClassItem } from "../types";

export function ClassManager({ onClose }: { onClose: () => void }) {
  const { classes, addClass, renameClass, recolorClass, removeClass, settings, updateSettings } = usePlanner();
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadFor, setUploadFor] = useState<ClassItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ClassItem | null>(null);

  const create = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await addClass(newName.trim());
      setNewName("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Manage classes" onClose={onClose} width={560}>
      <div className="flex flex-col gap-5">
        <div>
          <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">Semester range</h3>
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-xs text-neutral-500">
              Start
              <input
                type="date"
                value={settings?.semester_start ?? ""}
                onChange={(e) => updateSettings({ semester_start: e.target.value })}
                className="rounded-md border border-neutral-300 dark:border-neutral-600 bg-transparent px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-neutral-500">
              End
              <input
                type="date"
                value={settings?.semester_end ?? ""}
                onChange={(e) => updateSettings({ semester_end: e.target.value })}
                className="rounded-md border border-neutral-300 dark:border-neutral-600 bg-transparent px-2 py-1.5 text-sm"
              />
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">Classes</h3>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-2">
            Use <span className="font-medium">📄 Import syllabus</span> on a class to auto-fill its
            assignments and exams from a PDF or Word file.
          </p>
          <div className="flex flex-col gap-2">
            {classes.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-md border border-neutral-200 dark:border-neutral-700 px-2 py-2"
              >
                <div className="relative group">
                  <span
                    className="inline-block w-4 h-4 rounded-full cursor-pointer shrink-0 ring-1 ring-black/10"
                    style={{ backgroundColor: c.color }}
                  />
                  <div className="hidden group-hover:flex absolute z-10 top-6 left-0 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md p-1.5 gap-1 flex-wrap w-[132px] shadow-lg">
                    {SWATCHES.map((sw) => (
                      <button
                        key={sw}
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: sw }}
                        onClick={() => recolorClass(c.id, sw)}
                      />
                    ))}
                  </div>
                </div>
                <input
                  className="flex-1 min-w-0 bg-transparent text-sm text-neutral-800 dark:text-neutral-100 outline-none"
                  defaultValue={c.name}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== c.name) {
                      renameClass(c.id, e.target.value.trim());
                    }
                  }}
                />
                <button
                  className="flex items-center gap-1 rounded-md border border-neutral-300 dark:border-neutral-600 px-2 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 whitespace-nowrap"
                  onClick={() => setUploadFor(c)}
                  title="Upload this class's syllabus to auto-fill assignments and exams"
                >
                  <span aria-hidden>📄</span> Import syllabus
                </button>
                <button
                  className="text-xs text-red-400 hover:text-red-600"
                  onClick={() => setConfirmDelete(c)}
                >
                  Delete
                </button>
              </div>
            ))}
            {classes.length === 0 && (
              <p className="text-sm text-neutral-400">No classes yet. Add your first one below.</p>
            )}
          </div>

          <div className="flex gap-2 mt-3">
            <input
              className="flex-1 rounded-md border border-neutral-300 dark:border-neutral-600 bg-transparent px-3 py-1.5 text-sm"
              placeholder="New class name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") create();
              }}
            />
            <button
              onClick={create}
              disabled={busy || !newName.trim()}
              className="rounded-md bg-neutral-900 dark:bg-white px-3 py-1.5 text-sm font-medium text-white dark:text-neutral-900 hover:opacity-90 disabled:opacity-50"
            >
              Add class
            </button>
          </div>
        </div>
      </div>

      {uploadFor && <SyllabusUpload classItem={uploadFor} onClose={() => setUploadFor(null)} />}

      {confirmDelete && (
        <Modal title="Delete class?" onClose={() => setConfirmDelete(null)} width={380}>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            This will permanently delete <strong>{confirmDelete.name}</strong> and all of its tasks. This can't be
            undone.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setConfirmDelete(null)}
              className="rounded-md px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                await removeClass(confirmDelete.id);
                setConfirmDelete(null);
              }}
              className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
