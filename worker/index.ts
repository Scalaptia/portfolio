// The site is static files. This Worker sits in front of them for /api/* only (see
// run_worker_first in wrangler.jsonc). It keeps the harogatOS high scores and the faces visitors
// draw for the PC, both in D1.
//
// A score is never taken on trust. The game sends the column it stopped each row at, and the
// Worker replays them through the same rules the game ran (src/lib/stacker.ts), so the score it
// stores is one it worked out. It also hands out a run id when a game starts and checks, with its
// own clock, that the game took at least as long as those moves physically could.

import { replay, cleanInitials } from "../src/lib/stacker";
import { cleanArt, cleanScheme, cleanText, AUTHOR_MAX, MESSAGE_MAX } from "../src/lib/guestFaces";

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  /** Secret. Without it the moderation endpoints stay shut and every face stays pending. */
  ADMIN_TOKEN?: string;
  /** Secret, optional. A Discord webhook that hears about each new face. */
  DISCORD_WEBHOOK_URL?: string;
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

const FACES_PER_HOUR = 5;
const GALLERY_SIZE = 120;
const SITE = "https://fharo.dev";

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

// --- faces ------------------------------------------------------------------------------------

interface FaceRow {
  id: number;
  art: string;
  scheme: string;
  author: string;
  message: string;
  status?: string;
  created_at: number;
}

const toFace = (row: FaceRow) => ({
  id: row.id,
  art: cleanArt(row.art) ?? [],
  scheme: row.scheme,
  author: row.author,
  message: row.message,
  at: row.created_at,
  ...(row.status ? { status: row.status } : {}),
});

async function approvedFaces(env: Env) {
  const { results } = await env.DB.prepare(
    `SELECT id, art, scheme, author, message, created_at FROM faces
     WHERE status = 'approved' ORDER BY created_at DESC LIMIT ?`,
  )
    .bind(GALLERY_SIZE)
    .all<FaceRow>();
  return results.map(toFace);
}

// Discord renders a code block in a fixed-width font, so the face goes over as text.
function asText(art: string[]): string {
  return art.map((row) => row.replace(/\./g, "  ").replace(/#/g, "██").replace(/@/g, "▒▒")).join("\n");
}

async function notify(env: Env, id: number, art: string[], author: string, message: string) {
  if (!env.DISCORD_WEBHOOK_URL) return;
  const content = [
    `**New face #${id}** by **${author}**${message ? `: "${message}"` : ""}`,
    "```",
    asText(art),
    "```",
    `Review it at ${SITE}/harogatos/admin`,
  ].join("\n");
  try {
    await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 1990), allowed_mentions: { parse: [] } }),
    });
  } catch (error) {
    console.error("discord notify failed", error);
  }
}

async function submitFace(request: Request, env: Env, ctx: ExecutionContext) {
  let body: { art?: unknown; scheme?: unknown; author?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail("bad-json");
  }

  const art = cleanArt(body.art);
  if (!art) return fail("art");
  const scheme = cleanScheme(body.scheme);
  if (!scheme) return fail("scheme");
  const author = cleanText(body.author, AUTHOR_MAX, true);
  if (author === null) return fail("author");
  const message = cleanText(body.message, MESSAGE_MAX, false);
  if (message === null) return fail("message");

  const who = await visitor(request);
  const now = Date.now();
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM faces WHERE ip_hash = ? AND created_at > ?",
  )
    .bind(who, now - 60 * 60 * 1000)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= FACES_PER_HOUR) return fail("slow-down", 429);

  const row = await env.DB.prepare(
    `INSERT INTO faces (art, scheme, author, message, ip_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
  )
    .bind(art.join(""), scheme, author, message, who, now)
    .first<{ id: number }>();
  const id = row?.id ?? 0;

  ctx.waitUntil(notify(env, id, art, author, message));
  return json({ id, status: "pending" }, 201);
}

// Constant-time, so the token cannot be guessed a character at a time from response times.
async function authorized(request: Request, env: Env): Promise<boolean> {
  if (!env.ADMIN_TOKEN) return false;
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const [a, b] = await Promise.all(
    [given, env.ADMIN_TOKEN].map((v) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(v))),
  );
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0 && given.length > 0;
}

async function admin(request: Request, env: Env, path: string) {
  if (!env.ADMIN_TOKEN) return fail("admin-disabled", 503);
  if (!(await authorized(request, env))) return fail("unauthorized", 401);

  if (path === "/api/admin/faces" && request.method === "GET") {
    const status = new URL(request.url).searchParams.get("status") ?? "pending";
    if (!["pending", "approved", "rejected"].includes(status)) return fail("status");
    const { results } = await env.DB.prepare(
      `SELECT id, art, scheme, author, message, status, created_at FROM faces
       WHERE status = ? ORDER BY created_at DESC LIMIT 200`,
    )
      .bind(status)
      .all<FaceRow>();
    return json({ faces: results.map(toFace) });
  }

  const match = path.match(/^\/api\/admin\/faces\/(\d+)$/);
  if (match && request.method === "POST") {
    let body: { status?: unknown };
    try {
      body = await request.json();
    } catch {
      return fail("bad-json");
    }
    const status = body.status;
    if (status !== "approved" && status !== "rejected" && status !== "pending") return fail("status");
    const updated = await env.DB.prepare("UPDATE faces SET status = ?, reviewed_at = ? WHERE id = ? RETURNING id")
      .bind(status, Date.now(), Number(match[1]))
      .first<{ id: number }>();
    if (!updated) return fail("not-found", 404);
    return json({ id: updated.id, status });
  }

  return fail("not-found", 404);
}

// --- routing ----------------------------------------------------------------------------------

async function api(request: Request, env: Env, path: string, ctx: ExecutionContext): Promise<Response> {
  if (path === "/api/faces" && request.method === "GET") {
    return json({ faces: await approvedFaces(env) }, 200, "public, max-age=60");
  }
  if (path === "/api/faces" && request.method === "POST") return submitFace(request, env, ctx);
  if (path.startsWith("/api/admin/")) return admin(request, env, path);

  if (path === "/api/stacker/scores" && request.method === "GET") {
    return json({ top: await topScores(env) }, 200, "public, max-age=10");
  }
  if (path === "/api/stacker/scores" && request.method === "POST") return submitScore(request, env);
  if (path === "/api/stacker/runs" && request.method === "POST") return startRun(request, env);
  return fail("not-found", 404);
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    try {
      return await api(request, env, url.pathname, ctx);
    } catch (error) {
      console.error("api error", url.pathname, error);
      return fail("server", 500);
    }
  },
} satisfies ExportedHandler<Env>;
