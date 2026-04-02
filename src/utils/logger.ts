type LogLevel = "error" | "warn" | "info" | "debug";

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  [key: string]: unknown;
}

const DEFAULT_REDACT_FIELDS = [
  "phone",
  "email",
  "password",
  "access_token",
  "refresh_token",
  "client_secret",
  "authorization",
];

function redactValue(
  obj: unknown,
  redactFields: string[],
  seen: WeakSet<object>,
): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (seen.has(obj)) {
    return "[Circular]";
  }

  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => redactValue(item, redactFields, seen));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (redactFields.some((f) => f.toLowerCase() === key.toLowerCase())) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = redactValue(value, redactFields, seen);
    }
  }
  return result;
}

export class Logger {
  private level: number;
  private redactFields: string[];

  constructor(level: LogLevel = "info", redactFields: string[] = DEFAULT_REDACT_FIELDS) {
    const envLevel = process.env["LOG_LEVEL"] ?? process.env["FRONT_MCP_LOG_LEVEL"];
    if (
      typeof envLevel === "string" &&
      envLevel.length > 0 &&
      envLevel in LOG_LEVELS
    ) {
      this.level = LOG_LEVELS[envLevel as LogLevel];
    } else {
      this.level = LOG_LEVELS[level];
    }
    this.redactFields = redactFields;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] > this.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
    };

    if (context !== undefined) {
      const redacted = redactValue(context, this.redactFields, new WeakSet());
      Object.assign(entry, redacted);
    }

    process.stderr.write(JSON.stringify(entry) + "\n");
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log("error", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context);
  }
}
