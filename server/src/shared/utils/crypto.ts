import { randomBytes, createHash } from "crypto";

export function generateId(): string {
  return randomBytes(16).toString("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function validateSlug(slug: string): boolean {
  return /^[a-zA-Z0-9-]+$/.test(slug) && slug.length >= 1 && slug.length <= 50;
}