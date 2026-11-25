import { SignJWT, jwtVerify } from "jose";
import crypto from "node:crypto";
import type { Request, Response } from "express";
import { env } from "./env";

const COOKIE = "aether_admin";
const MAX_AGE = 60 * 60 * 24 * 30;
const key = () => new TextEncoder().encode(env.jwtSecret);

export function checkPassword(input: string): boolean {
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(env.adminPassword).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function startSession(res: Response) {
  const token = await new SignJWT({ role: "admin" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(key());
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: env.isProd, maxAge: MAX_AGE * 1000, path: "/" });
}

export function endSession(res: Response) {
  res.clearCookie(COOKIE, { path: "/" });
}

export async function isAdmin(req: Request): Promise<boolean> {
  const raw = req.headers.cookie?.split(";").map((c) => c.trim()).find((c) => c.startsWith(COOKIE + "="));
  if (!raw) return false;
  try {
    const { payload } = await jwtVerify(raw.slice(COOKIE.length + 1), key());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

/* Freno simple contra intentos de adivinar la clave: 8 fallos por IP cada 15 minutos. */
const attempts = new Map<string, { n: number; until: number }>();
export function loginAllowed(ip: string): boolean {
  const a = attempts.get(ip);
  if (a && a.until < Date.now()) attempts.delete(ip);
  return (attempts.get(ip)?.n ?? 0) < 8;
}
export function loginFailed(ip: string) {
  const a = attempts.get(ip) ?? { n: 0, until: Date.now() + 15 * 60_000 };
  a.n++;
  attempts.set(ip, a);
}
export const loginSucceeded = (ip: string) => attempts.delete(ip);
