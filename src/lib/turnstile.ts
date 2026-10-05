// Cloudflare Turnstile, the bot check on new faces. It runs invisibly: no checkbox, no puzzle,
// just a token the Worker trades with Cloudflare for a yes or no. The script only loads once
// someone reaches the signing step, so nobody else downloads it.

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
// The widget is registered for fharo.dev only. Anywhere else, Cloudflare's always-pass test key
// stands in, and the local Worker has no secret, so it does not check.
const SITE_KEY = "0x4AAAAAAFOtvAdNJo-TjOvE";
const TEST_KEY = "1x00000000000000000000AA";

interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  execute(id: string): void;
  reset(id: string): void;
  remove(id: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi | null> | null = null;

function load(): Promise<TurnstileApi | null> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => resolve(window.turnstile ?? null);
    script.onerror = () => {
      loading = null;
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * Mounts an invisible check in `el`. `token()` resolves to a fresh one-use token, or "" if the
 * check could not run (blocked script, offline). The Worker refuses "" on the live site.
 */
export function mountTurnstile(el: HTMLElement) {
  let id: string | null = null;
  let waiting: ((token: string) => void) | null = null;
  const ready = load().then((api) => {
    if (!api) return null;
    const live = location.hostname === "fharo.dev" || location.hostname === "www.fharo.dev";
    id = api.render(el, {
      sitekey: live ? SITE_KEY : TEST_KEY,
      execution: "execute",
      appearance: "interaction-only",
      callback: (token: string) => waiting?.(token),
      "error-callback": () => waiting?.(""),
    });
    return api;
  });

  return {
    async token(): Promise<string> {
      const api = await ready;
      if (!api || !id) return "";
      const widget = id;
      return new Promise<string>((resolve) => {
        const timer = setTimeout(() => resolve(""), 15000);
        waiting = (token) => {
          clearTimeout(timer);
          waiting = null;
          resolve(token);
        };
        // Tokens are one use. Start over every time, so a retry after an error gets a new one.
        api.reset(widget);
        api.execute(widget);
      });
    },
    remove() {
      void ready.then((api) => id && api?.remove(id));
    },
  };
}
