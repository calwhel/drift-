export const DEFAULT_PRIMARY_COLOR = "#7c3aed";
export const DEFAULT_BACKGROUND_COLOR = "#0a0a0f";

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHexColor(color: string): boolean {
  return HEX_COLOR.test(color);
}

export function normalizeHexColor(color: string): string {
  if (!HEX_COLOR.test(color)) return color;
  if (color.length === 4) {
    const r = color.charAt(1);
    const g = color.charAt(2);
    const b = color.charAt(3);
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return color.toLowerCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHexColor(hex);
  if (!HEX_COLOR.test(normalized) || normalized.length !== 7) return null;
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

/** Slightly lighter card surface derived from the page background */
export function deriveCardColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return "#111118";
  const mix = (c: number) => Math.min(255, Math.round(c + (255 - c) * 0.06));
  const r = mix(rgb.r).toString(16).padStart(2, "0");
  const g = mix(rgb.g).toString(16).padStart(2, "0");
  const b = mix(rgb.b).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

export function deriveBorderColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return "#1e1e2e";
  const mix = (c: number) => Math.min(255, Math.round(c + (255 - c) * 0.12));
  const r = mix(rgb.r).toString(16).padStart(2, "0");
  const g = mix(rgb.g).toString(16).padStart(2, "0");
  const b = mix(rgb.b).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

export interface PublicBranding {
  logo_url: string | null;
  primary_color: string;
  background_color: string;
  card_color: string;
  border_color: string;
  business_name: string | null;
  description: string | null;
}

export function toPublicBranding(settings: {
  logoUrl: string | null;
  primaryColor: string;
  backgroundColor: string;
  businessName: string | null;
  description: string | null;
}): PublicBranding {
  const background = normalizeHexColor(settings.backgroundColor) || DEFAULT_BACKGROUND_COLOR;
  return {
    logo_url: settings.logoUrl,
    primary_color: normalizeHexColor(settings.primaryColor) || DEFAULT_PRIMARY_COLOR,
    background_color: background,
    card_color: deriveCardColor(background),
    border_color: deriveBorderColor(background),
    business_name: settings.businessName,
    description: settings.description,
  };
}

const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

const MAX_LOGO_BYTES = 512 * 1024;

export function validateLogoFile(file: File): string | null {
  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    return "Logo must be PNG, JPEG, WebP, or SVG";
  }
  if (file.size > MAX_LOGO_BYTES) {
    return "Logo must be 512 KB or smaller";
  }
  return null;
}

export async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}
