"use server";

import { redirect } from "next/navigation";
import { createSession, createUser, destroySession, verifyPassword } from "@/lib/auth";
import { get } from "@/lib/db";

const MAX_USERS = 100;

function fail(message: string, mode?: string): never {
  const params = new URLSearchParams({ error: message, ...(mode ? { mode } : {}) });
  redirect(`/login?${params}`);
}

export async function signUp(form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const name = String(form.get("name") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < 8) fail("Password must be at least 8 characters.", "signup");
  if (get("SELECT 1 FROM users WHERE email = ?", email)) fail("That email already has an account.", "signup");
  const { n } = get<{ n: number }>("SELECT count(*) AS n FROM users")!;
  if (n >= MAX_USERS) fail("The beta is full (100 users).", "signup");

  const id = createUser(email, name, password);
  await createSession(id);
  redirect("/");
}

export async function signIn(form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const user = get<{ id: string; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE email = ?",
    email
  );
  if (!user || !verifyPassword(password, user.password_hash)) fail("Wrong email or password.");
  await createSession(user.id);
  redirect("/");
}

export async function signOut() {
  await destroySession();
  redirect("/login");
}
