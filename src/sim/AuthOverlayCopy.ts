/**
 * §2.3 Auth overlays — distinct 401 / 429 / 5xx copy.
 */

export type AuthErrorCode = 401 | 429 | 500 | "network";

export interface AuthOverlay {
  code: AuthErrorCode;
  title: string;
  body: string;
  action: "sign-in" | "retry" | "wait-retry";
  /** Suggested backoff seconds for 429. */
  backoffSec?: number;
}

export function authOverlayFor(code: AuthErrorCode, retryAfterSec?: number): AuthOverlay {
  if (code === 401) {
    return {
      code: 401,
      title: "Sign in required",
      body: "Your session expired or is missing. Sign in again to continue loading map tiles.",
      action: "sign-in",
    };
  }
  if (code === 429) {
    const wait = Math.max(1, retryAfterSec ?? 30);
    return {
      code: 429,
      title: "Rate limited",
      body: `Too many tile requests. Retrying in about ${wait}s.`,
      action: "wait-retry",
      backoffSec: wait,
    };
  }
  if (code === "network") {
    return {
      code: "network",
      title: "Connection issue",
      body: "Could not reach the tile service. Check your network and retry.",
      action: "retry",
    };
  }
  return {
    code: 500,
    title: "Service unavailable",
    body: "The map service returned an error. Retry when ready — the ground fallback stays visible.",
    action: "retry",
  };
}
