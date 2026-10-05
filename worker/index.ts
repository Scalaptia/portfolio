// The site is static files. This Worker sits in front of them for /api/* only (see
// run_worker_first in wrangler.jsonc) and keeps the harogatOS high scores in D1.
//
// A score is never taken on trust. The game sends the column it stopped each row at, and the
// Worker replays them through the same rules the game ran (src/lib/stacker.ts), so the score it
// stores is one it worked out. It also hands out a run id when a game starts and checks, with its
// own clock, that the game took at least as long as those moves physically could.

import { replay, cleanInitials } from "../src/lib/stacker";

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
}

const GAME = "stacker";
const BOARD_SIZE = 10;
// A run that sits unspent longer than this is not a game anyone is still playing.
const RUN_TTL_MS = 30 * 60 * 1000;
// Generous for a person, tight for a script.
const RUNS_PER_10_MIN = 80;
const SCORES_PER_HOUR = 40;
// The replayed minimum assumes perfect reactions. Allow some slack for clocks and latency.
const TIME_SLACK = 0.8;

const json = (body: unknown, status = 200, cache = "no-store") =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": cache },
  });

const fail = (error: string, status = 400) => json({ error }, status);

// Rate limits need to tell visitors apart, not know who they are. A salted hash of the address is
// enough for that, and it is all that gets stored.
async function visitor(request: Request): Promise<string> {
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const data = new TextEncoder().encode(`harogatos:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest).slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function topScores(env: Env) {
  const { results } = await env.DB.prepare(
    `SELECT initials, score, rows, created_at AS at FROM scores
     WHERE game = ? ORDER BY score DESC, created_at ASC LIMIT ?`,
  )
    .bind(GAME, BOARD_SIZE)
    .all<{ initials: string; score: number; rows: number; at: number }>();
  return results;
}

async function startRun(request: Request, env: Env) {
  const who = await visitor(request);
  const now = Date.now();

  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM runs WHERE ip_hash = ? AND started_at > ?",
  )
    .bind(who, now - 10 * 60 * 1000)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= RUNS_PER_10_MIN) return fail("slow-down", 429);

  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO runs (id, game, ip_hash, started_at) VALUES (?, ?, ?, ?)").bind(id, GAME, who, now),
    // Sweep out old runs while we are here, so the table never needs a cron.
    env.DB.prepare("DELETE FROM runs WHERE started_at < ?").bind(now - 24 * 60 * 60 * 1000),
  ]);
  return json({ id }, 201);
}

async function submitScore(request: Request, env: Env) {
  let body: { runId?: unknown; initials?: unknown; moves?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail("bad-json");
  }

  const initials = cleanInitials(body.initials);
  if (!initials) return fail("initials");
  if (typeof body.runId !== "string" || body.runId.length > 64) return fail("run");

  const result = replay(body.moves);
  if (!result.ok) return fail(`moves:${result.reason}`);
  if (result.score <= 0) return fail("no-score");

  const who = await visitor(request);
  const now = Date.now();

  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM scores WHERE ip_hash = ? AND created_at > ?",
  )
    .bind(who, now - 60 * 60 * 1000)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= SCORES_PER_HOUR) return fail("slow-down", 429);

  // Spend the run. The WHERE makes this the check as well: an unknown, used, expired or someone
  // else's run changes no rows.
  const spent = await env.DB.prepare(
    `UPDATE runs SET used = 1
     WHERE id = ? AND game = ? AND ip_hash = ? AND used = 0 AND started_at > ?
     RETURNING started_at`,
  )
    .bind(body.runId, GAME, who, now - RUN_TTL_MS)
    .first<{ started_at: number }>();
  if (!spent) return fail("run", 409);

  if (now - spent.started_at < result.minMs * TIME_SLACK) return fail("too-fast", 422);

  await env.DB.prepare(
    "INSERT INTO scores (game, initials, score, rows, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(GAME, initials, result.score, result.rows, who, now)
    .run();

  // Ties go to whoever got there first, so a new score ranks below every equal one.
  const above = await env.DB.prepare("SELECT COUNT(*) AS n FROM scores WHERE game = ? AND score >= ?")
    .bind(GAME, result.score)
    .first<{ n: number }>();

  return json({ rank: above?.n ?? 1, score: result.score, top: await topScores(env) }, 201);
}

async function api(request: Request, env: Env, path: string): Promise<Response> {
  if (path === "/api/stacker/scores" && request.method === "GET") {
    return json({ top: await topScores(env) }, 200, "public, max-age=10");
  }
  if (path === "/api/stacker/scores" && request.method === "POST") return submitScore(request, env);
  if (path === "/api/stacker/runs" && request.method === "POST") return startRun(request, env);
  return fail("not-found", 404);
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    try {
      return await api(request, env, url.pathname);
    } catch (error) {
      console.error("api error", url.pathname, error);
      return fail("server", 500);
    }
  },
} satisfies ExportedHandler<Env>;
