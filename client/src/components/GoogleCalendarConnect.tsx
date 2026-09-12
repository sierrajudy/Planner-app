import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Status {
  connected: boolean;
  configured: boolean;
  email: string | null;
}

export function GoogleCalendarConnect() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setStatus(await api.getGoogleStatus());
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.getGoogleAuthUrl();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start Google sign-in");
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await api.disconnectGoogle();
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!status || !status.configured) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2">
      <span aria-hidden>📅</span>
      {status.connected ? (
        <>
          <span className="text-neutral-700 dark:text-neutral-200">
            Google Calendar connected{status.email ? ` as ${status.email}` : ""}
          </span>
          <button
            onClick={disconnect}
            disabled={busy}
            className="ml-auto text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
          >
            Disconnect
          </button>
        </>
      ) : (
        <>
          <span className="text-neutral-500 dark:text-neutral-400">
            Connect Google Calendar so the plan avoids your other commitments.
          </span>
          <button
            onClick={connect}
            disabled={busy}
            className="ml-auto rounded-md border border-neutral-300 dark:border-neutral-600 px-2 py-1 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
          >
            {busy ? "Redirecting…" : "Connect"}
          </button>
        </>
      )}
      {error && <span className="w-full text-xs text-red-500">{error}</span>}
    </div>
  );
}
