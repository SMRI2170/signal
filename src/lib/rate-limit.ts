type LimitEntry = { count: number; resetAt: number };
const entries = new Map<string, LimitEntry>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = entries.get(key);
  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (current.count >= limit) return { allowed: false };
  current.count += 1;
  return { allowed: true };
}

export function guestRateLimitKey(request: Request, action: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown-ip";
  const session = request.headers.get("x-signal-guest-session") ?? "unknown-session";
  return `${action}:${ip}:${session}`;
}
