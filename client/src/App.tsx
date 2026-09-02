import { useState } from "react";
import { PlannerProvider, usePlanner } from "./store";
import { SemesterGrid } from "./components/SemesterGrid";
import { AgendaView } from "./components/AgendaView";
import { ExamList } from "./components/ExamList";
import { ClassManager } from "./components/ClassManager";
import { TaskEditor } from "./components/TaskEditor";
import { CelebrationProvider } from "./components/Celebration";
import { todayISO } from "./lib/dates";

type View = "semester" | "week" | "today" | "exams";

function PlannerApp() {
  const { loading, error, classes } = usePlanner();
  const [view, setView] = useState<View>("today");
  const [managing, setManaging] = useState(false);
  const [adding, setAdding] = useState(false);

  const tabs: { id: View; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "week", label: "This Week" },
    { id: "semester", label: "Whole Semester" },
    { id: "exams", label: "Tests & Midterms" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      <header className="flex items-center gap-4 px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-lg font-semibold">Planner</h1>
        <nav className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                view === t.id
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <button
          onClick={() => setAdding(true)}
          className="ml-auto rounded-md bg-neutral-900 dark:bg-white px-3 py-1.5 text-sm font-medium text-white dark:text-neutral-900 hover:opacity-90"
        >
          + Add assignment
        </button>
        <button
          onClick={() => setManaging(true)}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Manage classes
        </button>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        {loading && <p className="p-6 text-sm text-neutral-500">Loading planner…</p>}
        {error && <p className="p-6 text-sm text-red-500">{error}</p>}
        {!loading && !error && (
          <div className="flex-1 overflow-auto">
            {view === "semester" && <SemesterGrid />}
            {view === "week" && <AgendaView mode="week" />}
            {view === "today" && <AgendaView mode="today" />}
            {view === "exams" && <ExamList />}
          </div>
        )}
      </main>

      {managing && <ClassManager onClose={() => setManaging(false)} />}
      {adding && (
        <TaskEditor
          date={todayISO()}
          classItem={null}
          classes={classes}
          existing={null}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <PlannerProvider>
      <CelebrationProvider>
        <PlannerApp />
      </CelebrationProvider>
    </PlannerProvider>
  );
}
