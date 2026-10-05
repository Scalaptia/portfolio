import { useCallback, useEffect, useState } from "react";
import type { GuestFace } from "@/lib/guestFaces";
import { guestFace } from "@/components/pc-model/faces";
import FaceIcon from "./FaceIcon";

// The moderation queue. Every face a visitor sends lands here as pending and stays off everyone
// else's screen until it is approved. The token is the Worker's ADMIN_TOKEN secret, kept in this
// browser's localStorage so it is typed once.

type Status = "pending" | "approved" | "rejected";
type AdminFace = GuestFace & { status: Status };

const TOKEN_KEY = "harogatos:admin-token";
const BUTTON = "press [--press:3px] px-3 py-1.5 border-2 border-text font-ubuntu-mono font-bold text-sm";

const ERRORS: Record<number, string> = {
  401: "That token is wrong.",
  503: "Moderation is off. Set the ADMIN_TOKEN secret on the Worker.",
};

export default function AdminFaces() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const [draftToken, setDraftToken] = useState("");
  const [status, setStatus] = useState<Status>("pending");
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
    setError(null);
    try {
      const body = await request(`/api/admin/faces?status=${status}`);
      setFaces(body.faces);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token, status, request]);

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
        {(["pending", "approved", "rejected"] as Status[]).map((s) => (
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
      {faces === null && !error && <p className="font-ubuntu-mono text-text/60">Loading...</p>}
      {faces?.length === 0 && <p className="font-ubuntu-mono text-text/60">Nothing {status}.</p>}

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
