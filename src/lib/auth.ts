import "server-only";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { get, run, newId } from "./db";

const COOKIE = "dg_session";
const SESSION_DAYS = 30;

export type User = { id: string; email: string; name: string | null };

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}

export async function createSession(userId: string) {
  const id = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  run("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)", id, userId, expires.toISOString());
  (await cookies()).set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // served over plain http on your home network
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) run("DELETE FROM sessions WHERE id = ?", id);
  jar.delete(COOKIE);
}

export async function getUser(): Promise<User | null> {
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return null;
  return (
    get<User>(
      `SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > ?`,
      id,
      new Date().toISOString()
    ) ?? null
  );
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export function createUser(email: string, name: string, password: string) {
  const id = newId();
  run(
    "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)",
    id,
    email.trim(),
    name.trim() || null,
    hashPassword(password)
  );
  return id;
}
