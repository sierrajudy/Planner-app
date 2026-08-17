import { useRef, useState } from "react";
import { Modal } from "./Modal";
import { usePlanner } from "../store";
import { api } from "../lib/api";
import type { ClassItem, ExtractedItem } from "../types";

interface ReviewItem extends ExtractedItem {
  include: boolean;
}

export function SyllabusUpload({ classItem, onClose }: { classItem: ClassItem; onClose: () => void }) {
  const { bulkAddTasks, settings } = usePlanner();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"upload" | "review">("upload");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const semesterStart = settings ? new Date(settings.semester_start) : new Date();
  const referenceYear = semesterStart.getFullYear();
  const referenceMonth = semesterStart.getMonth() + 1;

  const handleFile = async (file: File) => {
    setParsing(true);
    setError(null);
    setFileName(file.name);
    try {
      const result = await api.parseSyllabus(file, referenceYear, referenceMonth);
      if (result.items.length === 0) {
        setError("Couldn't find any dated items in that file. You can still add tasks manually.");
      }
      setItems(result.items.map((i) => ({ ...i, include: true })));
      setStage("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse syllabus");
    } finally {
      setParsing(false);
    }
  };

  const commit = async () => {
    const toAdd = items.filter((i) => i.include && i.date && i.title.trim());
    if (toAdd.length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await bulkAddTasks(
        toAdd.map((i) => ({
          class_id: classItem.id,
          date: i.date,
          title: i.title.trim(),
          description: i.description,
          source: "syllabus",
        }))
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save tasks");
      setSaving(false);
    }
  };

  const updateItem = (idx: number, patch: Partial<ReviewItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  return (
    <Modal title={`Upload syllabus — ${classItem.name}`} onClose={onClose} width={640}>
      {stage === "upload" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Upload a PDF, Word doc, or text file of the syllabus. This scans for dated readings, assignments,
            and exams so you can review them before adding to your planner — it won't catch everything, so
            double-check the results below.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {parsing && <p className="text-sm text-neutral-500">Reading {fileName}…</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}

      {stage === "review" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Found {items.length} item{items.length === 1 ? "" : "s"}. Uncheck anything you don't want, or edit
            before adding.
          </p>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="max-h-[50vh] overflow-y-auto flex flex-col gap-2">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex gap-2 items-start rounded-md border border-neutral-200 dark:border-neutral-700 p-2"
              >
                <input
                  type="checkbox"
                  checked={item.include}
                  onChange={(e) => updateItem(idx, { include: e.target.checked })}
                  className="mt-2 shrink-0"
                />
                <input
                  type="date"
                  value={item.date}
                  onChange={(e) => updateItem(idx, { date: e.target.value })}
                  className="rounded border border-neutral-300 dark:border-neutral-600 bg-transparent px-2 py-1 text-xs w-[130px]"
                />
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateItem(idx, { title: e.target.value })}
                  className="flex-1 rounded border border-neutral-300 dark:border-neutral-600 bg-transparent px-2 py-1 text-sm"
                />
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-neutral-400">No items to review.</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              onClick={commit}
              disabled={saving}
              className="rounded-md bg-neutral-900 dark:bg-white px-3 py-1.5 text-sm font-medium text-white dark:text-neutral-900 hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Adding..." : `Add ${items.filter((i) => i.include).length} task(s)`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
