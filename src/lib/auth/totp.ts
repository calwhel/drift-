import speakeasy from "speakeasy";
import QRCode from "qrcode";

const APP_NAME = "Drift Payment";

export function generateTotpSecret(email: string) {
  return speakeasy.generateSecret({
    name: `${APP_NAME} (${email})`,
    issuer: APP_NAME,
    length: 20,
  });
}

export async function generateQrDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, { width: 200, margin: 2 });
}

export function verifyTotp(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1,
  });
}
