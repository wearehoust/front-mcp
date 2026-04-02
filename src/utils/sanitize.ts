const DEFAULT_REDACTED_FIELDS = [
  "phone",
  "phone_number",
  "social_security",
  "credit_card",
  "password",
  "secret",
  "api_key",
  "access_token",
  "refresh_token",
  "client_secret",
];

export interface SanitizationConfig {
  enabled: boolean;
  redactedFields: string[];
  redactedPatterns: RegExp[];
  replacementText: string;
}

export function createSanitizationConfig(
  overrides?: Partial<{
    enabled: boolean;
    redacted_fields: string[];
    redacted_patterns: string[];
    replacement_text: string;
  }>,
): SanitizationConfig {
  return {
    enabled: overrides?.enabled ?? true,
    redactedFields: [
      ...DEFAULT_REDACTED_FIELDS,
      ...(overrides?.redacted_fields ?? []),
    ],
    redactedPatterns: (overrides?.redacted_patterns ?? []).map(
      (p) => new RegExp(p, "gi"),
    ),
    replacementText: overrides?.replacement_text ?? "[REDACTED]",
  };
}

export function sanitize(
  obj: unknown,
  config: SanitizationConfig,
): unknown {
  if (!config.enabled) {
    return obj;
  }
  return sanitizeValue(obj, config, new WeakSet());
}

function sanitizeValue(
  value: unknown,
  config: SanitizationConfig,
  seen: WeakSet<object>,
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return applyPatterns(value, config);
  }

  if (typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return config.replacementText;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, config, seen));
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (isRedactedField(key, config.redactedFields)) {
      result[key] = config.replacementText;
    } else {
      result[key] = sanitizeValue(val, config, seen);
    }
  }
  return result;
}

function isRedactedField(fieldName: string, redactedFields: string[]): boolean {
  const lower = fieldName.toLowerCase();
  return redactedFields.some((f) => f.toLowerCase() === lower);
}

function applyPatterns(value: string, config: SanitizationConfig): string {
  let result = value;
  for (const pattern of config.redactedPatterns) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, config.replacementText);
  }
  return result;
}
