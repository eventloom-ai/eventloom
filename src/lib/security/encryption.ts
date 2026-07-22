import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

function key() {
  const configured = env.registrantEncryptionKey();
  if (!configured) return null;
  const decoded = /^[a-f0-9]{64}$/i.test(configured)
    ? Buffer.from(configured, "hex")
    : Buffer.from(configured, "base64");
  return decoded.length === 32 ? decoded : null;
}

export function encryptSensitiveJson(value: unknown) {
  const encryptionKey = key();
  if (!encryptionKey) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptSensitiveJson(value: string) {
  const encryptionKey = key();
  const [ivRaw, tagRaw, ciphertextRaw] = value.split(".");
  if (!encryptionKey || !ivRaw || !tagRaw || !ciphertextRaw) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(ivRaw, "base64url"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    return JSON.parse(Buffer.concat([
      decipher.update(Buffer.from(ciphertextRaw, "base64url")),
      decipher.final(),
    ]).toString("utf8")) as unknown;
  } catch {
    return null;
  }
}
