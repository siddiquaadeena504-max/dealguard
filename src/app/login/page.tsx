import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string }>;
}) {
  if (await getUser()) redirect("/");
  const { error, mode } = await searchParams;
  const hasUsers = !!get("SELECT 1 FROM users LIMIT 1");
  const signup = mode === "signup" || !hasUsers;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="size-6 text-primary" /> DealGuard
          </div>
          <CardTitle>{signup ? "Create your account" : "Sign in"}</CardTitle>
          <CardDescription>
            {signup
              ? "Your account and data are stored only on this laptop."
              : "Welcome back."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signup ? signUp : signIn} className="space-y-4">
            {signup && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" name="name" autoComplete="name" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={signup ? "new-password" : "current-password"}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              {signup ? "Create account" : "Sign in"}
            </Button>
          </form>
          {hasUsers && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {signup ? (
                <a href="/login" className="underline">Already have an account? Sign in</a>
              ) : (
                <a href="/login?mode=signup" className="underline">New here? Create an account</a>
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
