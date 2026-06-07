import { generateSecret, generateURI, verifySync } from "otplib";
import { randomBytes } from "crypto";

export function generateTotpSecret(): string {
  return generateSecret();
}

export function getTotpUri(secret: string, email: string): string {
  return generateURI({ issuer: "Drift Payment", label: email, secret });
}

export function verifyTotp(token: string, secret: string): boolean {
  const result = verifySync({ token, secret });
  return result.valid;
}

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    randomBytes(4).toString("hex").toUpperCase()
  );
}
