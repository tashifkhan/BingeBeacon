"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLogin } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { AxiosError } from "axios";
import type { ApiError } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const loginMutation = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      await loginMutation.mutateAsync({ email, password });
      router.push("/");
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setError(
        axiosErr.response?.data?.error?.message ?? "Login failed. Please try again."
      );
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 glow-amber">
              <div className="h-4 w-4 rounded-full bg-primary animate-beacon-pulse" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Binge<span className="text-primary">Beacon</span>
            </h1>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
              autoComplete="email"
              className="h-11 bg-muted/50 border-border/50 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
              autoComplete="current-password"
              minLength={8}
              className="h-11 bg-muted/50 border-border/50 rounded-xl"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive animate-fade-in">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full h-11 bg-primary text-primary-foreground glow-amber hover:glow-amber-strong font-semibold rounded-xl"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
