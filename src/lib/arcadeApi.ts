// The arcade's side of the Worker API in worker/index.ts. Every call resolves to null when the API
// is not there (astro dev without wrangler, the Docker build, no network), and the games keep
// working without a scoreboard.

export interface ScoreRow {
  initials: string;
  score: number;
  rows: number;
  at: number;
}

export interface Submitted {
  rank: number;
  score: number;
  top: ScoreRow[];
}

async function call<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(path, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function startRun(): Promise<string | null> {
  const body = await call<{ id: string }>("/api/stacker/runs", { method: "POST" });
  return body?.id ?? null;
}

export function submitScore(runId: string, initials: string, moves: number[]) {
  return call<Submitted>("/api/stacker/scores", {
    method: "POST",
    body: JSON.stringify({ runId, initials, moves }),
  });
}

export async function topScores(): Promise<ScoreRow[] | null> {
  const body = await call<{ top: ScoreRow[] }>("/api/stacker/scores");
  return body?.top ?? null;
}
