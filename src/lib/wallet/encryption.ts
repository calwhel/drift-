import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

function getEncryptionKey(): Buffer {
  const primary = process.env.WALLET_ENCRYPTION_KEY;
  if (primary) {
    return scryptSync(primary, "drift-wallet-encryption-v1", 32);
  }
  const fallback = process.env.NEXTAUTH_SECRET;
  if (!fallback) {
    throw new Error("WALLET_ENCRYPTION_KEY or NEXTAUTH_SECRET must be set");
  }
  console.warn(
    "[encryption] WALLET_ENCRYPTION_KEY not set — using NEXTAUTH_SECRET fallback. Set a dedicated key in production."
  );
  return scryptSync(fallback, "drift-wallet-encryption-v1", 32);
}

export function encryptPrivateKey(privateKey: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptPrivateKey(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted key format");
  }
  const key = getEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
