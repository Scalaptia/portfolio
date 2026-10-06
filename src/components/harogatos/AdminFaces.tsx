import { useCallback, useEffect, useState } from "react";
import type { GuestFace } from "@/lib/guestFaces";
import { guestFace } from "@/components/pc-model/faces";
import FaceIcon from "./FaceIcon";

// The moderation queue. Every face a visitor sends lands here as pending and stays off everyone
// else's screen until it is approved. The scores tab lists every Stacker score, ten to a page, so
// anything the initials blocklist missed can be deleted. The token is the Worker's ADMIN_TOKEN
// secret, kept in this browser's localStorage so it is typed once.

type Status = "pending" | "approved" | "rejected";
type Tab = Status | "scores";
type AdminFace = GuestFace & { status: Status };
interface AdminScore {
  id: number;
  initials: string;
  score: number;
  rows: number;
  at: number;
}
interface ScoresPage {
  top: AdminScore[];
  page: number;
  pages: number;
  total: number;
  perPage: number;
}

const TOKEN_KEY = "harogatos:admin-token";
const BUTTON = "press [--press:3px] px-3 py-1.5 border-2 border-text font-ubuntu-mono font-bold text-sm";

const ERRORS: Record<number, string> = {
  401: "That token is wrong.",
  503: "Moderation is off. Set the ADMIN_TOKEN secret on the Worker.",
};

export default function AdminFaces() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const [draftToken, setDraftToken] = useState("");
  const [status, setStatus] = useState<Tab>("pending");
  const [scores, setScores] = useState<ScoresPage | null>(null);
  const [scorePage, setScorePage] = useState(0);
  const [faces, setFaces] = useState<AdminFace[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      const response = await fetch(path, {
        ...init,
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          setToken("");
        }
        throw new Error(ERRORS[response.status] ?? `The Worker said ${response.status}.`);
      }
      return response.json();
    },
    [token],
  );

  const load = useCallback(async () => {
    if (!token) return;
    setFaces(null);
    setScores(null);
    setError(null);
    try {
      if (status === "scores") {
        setScores(await request(`/api/admin/scores?page=${scorePage}`));
      } else {
        const body = await request(`/api/admin/faces?status=${status}`);
        setFaces(body.faces);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token, status, scorePage, request]);

  const removeScore = async (row: AdminScore) => {
    if (!confirm(`Delete ${row.initials} ${row.score} from the board? This cannot be undone.`)) return;
    setBusy(row.id);
    try {
      await request(`/api/admin/scores/${row.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: number, next: Status) => {
    setBusy(id);
    try {
      await request(`/api/admin/faces/${id}`, { method: "POST", body: JSON.stringify({ status: next }) });
      setFaces((list) => list?.filter((f) => f.id !== id) ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!token) {
    return (
      <form
        className="w-full max-w-md mx-auto flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          localStorage.setItem(TOKEN_KEY, draftToken.trim());
          setToken(draftToken.trim());
        }}
      >
        <label className="font-ubuntu-mono text-text font-bold">Admin token</label>
        <input
          type="password"
          value={draftToken}
          onChange={(e) => setDraftToken(e.target.value)}
          className="border-2 border-text px-3 py-2 font-ubuntu-mono bg-white"
          autoFocus
        />
        <button className={`${BUTTON} bg-primary self-start`}>Open the queue</button>
        {error && <p className="font-open-sans text-text">{error}</p>}
      </form>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-wrap gap-2 items-center">
        {(["pending", "approved", "rejected", "scores"] as Tab[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`${BUTTON} ${status === s ? "bg-text text-white" : "bg-white text-text"}`}
          >
            {s}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => void load()} className={`${BUTTON} bg-white`}>
          Refresh
        </button>
        <button
          onClick={() => {
            localStorage.removeItem(TOKEN_KEY);
            setToken("");
          }}
          className={`${BUTTON} bg-white`}
        >
          Forget token
        </button>
      </div>

      {error && <p className="font-open-sans text-text">{error}</p>}
      {status === "scores" ? (
        <Scores data={scores} error={error} busy={busy} onDelete={removeScore} onPage={setScorePage} />
      ) : (
        <>
          {faces === null && !error && <p className="font-ubuntu-mono text-text/60">Loading...</p>}
          {faces?.length === 0 && <p className="font-ubuntu-mono text-text/60">Nothing {status}.</p>}
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {faces?.map((face) => {
          const data = guestFace(face.art, face.scheme);
          return (
            <div
              key={face.id}
              className="bg-white border-4 border-text shadow-[6px_6px_0px_0px_rgba(65,44,71,1)] p-4 flex flex-col gap-3"
            >
              <FaceIcon art={face.art} color={data.color} accent={data.accent} className="w-full aspect-square" />
              <div className="font-ubuntu-mono text-text">
                <p className="font-bold">
                  #{face.id} {face.author}
                </p>
                <p className="text-sm wrap-break-word">{face.message || <span className="text-text/50">(no note)</span>}</p>
                <p className="text-xs text-text/50 mt-1">{new Date(face.at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2 mt-auto">
                {status !== "approved" && (
                  <button disabled={busy === face.id} onClick={() => decide(face.id, "approved")} className={`${BUTTON} bg-primary`}>
                    Approve
                  </button>
                )}
                {status !== "rejected" && (
                  <button disabled={busy === face.id} onClick={() => decide(face.id, "rejected")} className={`${BUTTON} bg-white`}>
                    {status === "approved" ? "Take down" : "Reject"}
                  </button>
                )}
                {status === "rejected" && (
                  <button disabled={busy === face.id} onClick={() => decide(face.id, "pending")} className={`${BUTTON} bg-white`}>
                    Back to queue
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Scores({
  data,
  error,
  busy,
  onDelete,
  onPage,
}: {
  data: ScoresPage | null;
  error: string | null;
  busy: number | null;
  onDelete: (row: AdminScore) => void;
  onPage: (page: number) => void;
}) {
  if (!data) return error ? null : <p className="font-ubuntu-mono text-text/60">Loading...</p>;
  if (!data.total) return <p className="font-ubuntu-mono text-text/60">No scores yet.</p>;

  const first = data.page * data.perPage + 1;
  return (
    <div className="flex flex-col gap-4">
      <p className="font-ubuntu-mono text-sm text-text/60">
        {data.total} score{data.total === 1 ? "" : "s"} on the board
      </p>
      <div className="bg-white border-4 border-text shadow-[6px_6px_0px_0px_rgba(65,44,71,1)] overflow-x-auto">
        <table className="w-full font-ubuntu-mono text-text tabular-nums">
          <thead>
            <tr className="text-left text-sm text-text/60 border-b-2 border-text">
              <th className="px-3 py-2 text-right">#</th>
              <th className="px-3 py-2">Who</th>
              <th className="px-3 py-2 text-right">Score</th>
              <th className="px-3 py-2 text-right">Rows</th>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {data.top.map((row, i) => (
              <tr key={row.id} className="border-b border-text/15 last:border-b-0">
                <td className="px-3 py-2 text-right">{first + i}</td>
                <td className="px-3 py-2 font-bold">{row.initials}</td>
                <td className="px-3 py-2 text-right">{row.score}</td>
                <td className="px-3 py-2 text-right">{row.rows}</td>
                <td className="px-3 py-2 text-sm text-text/60 whitespace-nowrap">{new Date(row.at).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">
                  <button disabled={busy === row.id} onClick={() => onDelete(row)} className={`${BUTTON} bg-white`}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.pages > 1 && (
        <div className="flex items-center gap-3 font-ubuntu-mono text-text">
          <button disabled={data.page === 0} onClick={() => onPage(data.page - 1)} className={`${BUTTON} bg-white disabled:opacity-40`}>
            Previous
          </button>
          <span className="tabular-nums">
            {data.page + 1} / {data.pages}
          </span>
          <button
            disabled={data.page >= data.pages - 1}
            onClick={() => onPage(data.page + 1)}
            className={`${BUTTON} bg-white disabled:opacity-40`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
