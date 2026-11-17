// Crash text for the in-game reporter. Strips things that must not be copied
// into a bug report: Google keys, query-string keys, and very long tokens.

const KEY = /AIza[0-9A-Za-z_-]{8,}/g;
const QUERY_KEY = /([?&]key=)[^&\s]+/gi;
const LONG_TOKEN = /\b[A-Za-z0-9_-]{48,}\b/g;

export function redactSecrets(text: string): string {
  return text.replace(KEY, "[key]").replace(QUERY_KEY, "$1[redacted]").replace(LONG_TOKEN, "[token]");
}

export function formatCrash(message: string, stack?: string, href?: string): string {
  const where = href ? redactSecrets(href.split("?")[0]) : "";
  const lines = [
    "The Narrows crash report",
    where ? `page: ${where}` : "",
    `message: ${redactSecrets(message || "unknown")}`,
    stack ? redactSecrets(stack).split("\n").slice(0, 8).join("\n") : "",
  ];
  return lines.filter(Boolean).join("\n");
}
