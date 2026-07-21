/** Unwrap Drizzle / Neon errors into a user-safe message. */
export function getDbErrorMessage(err: unknown): string {
  const root = unwrapError(err);
  const msg = root instanceof Error ? root.message : String(root);
  const lower = msg.toLowerCase();

  if (lower.includes("does not exist") && lower.includes("relation")) {
    return "Database tables missing. Migrations may not have run — retry deploy or contact support.";
  }
  if (lower.includes("database_url") || lower.includes("connection string")) {
    return "Server misconfigured: database not connected.";
  }
  if (
    lower.includes("connect") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("timeout") ||
    lower.includes("websocket")
  ) {
    return "Cannot connect to database. Please try again shortly.";
  }
  if (lower.includes("unique") || lower.includes("duplicate")) {
    return "Email already registered";
  }
  if (msg.startsWith("Failed query:")) {
    return "Database unavailable. Please try again shortly.";
  }
  return msg;
}

export function isDbUnavailableError(err: unknown): boolean {
  const root = unwrapError(err);
  const msg = root instanceof Error ? root.message : String(root);
  const lower = msg.toLowerCase();
  return (
    msg.startsWith("Failed query:") ||
    lower.includes("connect") ||
    lower.includes("econnrefused") ||
    lower.includes("websocket") ||
    lower.includes("timeout") ||
    (lower.includes("does not exist") && lower.includes("relation"))
  );
}

function unwrapError(err: unknown): unknown {
  if (!err || typeof err !== "object") return err;
  const withCause = err as { cause?: unknown; message?: string };
  if (withCause.cause) return unwrapError(withCause.cause);
  return err;
}
