import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  pbkdf2Sync,
} from "node:crypto";
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { chmod, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir, hostname, userInfo } from "node:os";
import { z } from "zod";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;
const TOKEN_FILE_NAME = "tokens.enc";

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  refresh_expires_at: number;
}

const StoredTokensSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_at: z.number().int().nonnegative(),
  refresh_expires_at: z.number().int().nonnegative(),
});

const EncryptedFileSchema = z.object({
  version: z.literal(1),
  encrypted: z.literal(true),
  algorithm: z.string(),
  data: z.string(),
  iv: z.string(),
  tag: z.string(),
  salt: z.string(),
  created_at: z.string(),
  refresh_expires_at: z.string(),
});

type EncryptedFile = z.infer<typeof EncryptedFileSchema>;

function getTokenDir(): string {
  const xdgConfig = process.env["XDG_CONFIG_HOME"];
  if (typeof xdgConfig === "string" && xdgConfig.length > 0) {
    return join(xdgConfig, "front-mcp");
  }
  return join(homedir(), ".front-mcp");
}

function getTokenPath(): string {
  return join(getTokenDir(), TOKEN_FILE_NAME);
}

function deriveKey(salt: Buffer, passphrase?: string): Buffer {
  const machineId = `${hostname()}:${userInfo().username}:${process.platform}`;
  const secret = typeof passphrase === "string" && passphrase.length > 0
    ? `${machineId}:${passphrase}`
    : machineId;
  return pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha256");
}

export async function saveTokens(tokens: StoredTokens, passphrase?: string): Promise<void> {
  const dir = getTokenDir();
  if (!existsSync(dir)) {
    // 0o700 — directory is owner-only. Existing dir perms left alone to avoid
    // surprising users who manage ~/.front-mcp/ for other config.
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(salt, passphrase);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = JSON.stringify(tokens);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const file: EncryptedFile = {
    version: 1,
    encrypted: true,
    algorithm: ALGORITHM,
    data: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    salt: salt.toString("base64"),
    created_at: new Date().toISOString(),
    refresh_expires_at: new Date(tokens.refresh_expires_at).toISOString(),
  };

  const tokenPath = getTokenPath();
  // Atomic write: create temp file with 0600 perms, then rename. This ensures
  // the file never exists with permissive defaults (e.g. 0644 from umask),
  // and a crash mid-write can't leave a half-written tokens.enc.
  const tmpPath = `${tokenPath}.${process.pid.toString()}.${randomBytes(6).toString("hex")}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(file, null, 2), { encoding: "utf-8", mode: 0o600 });
  try {
    renameSync(tmpPath, tokenPath);
  } catch (err) {
    try { unlinkSync(tmpPath); } catch { /* best-effort cleanup */ }
    throw err;
  }
  // Defense-in-depth: re-assert 0600 in case the rename preserved a previous
  // file's mode on some platforms.
  await chmod(tokenPath, 0o600);
}

export async function loadTokens(passphrase?: string): Promise<StoredTokens | null> {
  const tokenPath = getTokenPath();
  if (!existsSync(tokenPath)) {
    return null;
  }

  let raw: string;
  try {
    raw = readFileSync(tokenPath, "utf-8");
  } catch {
    return null;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return null;
  }

  const fileResult = EncryptedFileSchema.safeParse(parsedJson);
  if (!fileResult.success) {
    return null;
  }
  const file = fileResult.data;

  if (file.algorithm !== ALGORITHM) {
    return null;
  }

  const salt = Buffer.from(file.salt, "base64");
  const iv = Buffer.from(file.iv, "base64");
  const tag = Buffer.from(file.tag, "base64");
  const data = Buffer.from(file.data, "base64");
  const key = deriveKey(salt, passphrase);

  let decryptedJson: unknown;
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(data),
      decipher.final(),
    ]);
    decryptedJson = JSON.parse(decrypted.toString("utf-8"));
  } catch {
    return null;
  }

  const tokensResult = StoredTokensSchema.safeParse(decryptedJson);
  if (!tokensResult.success) {
    return null;
  }
  return tokensResult.data;
}

export function clearTokens(): void {
  const tokenPath = getTokenPath();
  if (existsSync(tokenPath)) {
    unlinkSync(tokenPath);
  }
}

export async function getTokenFilePermissions(): Promise<number | null> {
  const tokenPath = getTokenPath();
  if (!existsSync(tokenPath)) {
    return null;
  }
  const stats = await stat(tokenPath);
  return stats.mode & 0o777;
}

export function isTokenExpiringSoon(tokens: StoredTokens, windowMs: number = 24 * 60 * 60 * 1000): boolean {
  return tokens.refresh_expires_at - Date.now() < windowMs;
}
