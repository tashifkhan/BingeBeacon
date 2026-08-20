import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLogin } from "@/hooks/use-auth";
import { AuthShell, AuthError, PasswordInput } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/motion/loader";
import type { AxiosError } from "axios";
import type { ApiError } from "@/types";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await loginMutation.mutateAsync({ email, password });
      await navigate({ to: "/" });
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setError(
        axiosErr.response?.data?.error?.message ??
          "Login failed. Please try again."
      );
    }
  }

  return (
    <AuthShell
      subtitle="Sign in to your account"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-primary transition-colors can-hover:hover:text-primary/80"
          >
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            enterKeyHint="next"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
            className="h-12 rounded-xl border-border/60 bg-muted/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            placeholder="Your password"
            autoComplete="current-password"
            minLength={8}
          />
        </div>

        <AuthError message={error} />

        <Button
          type="submit"
          className="h-12 w-full rounded-xl font-semibold glow-amber press can-hover:hover:glow-amber-strong"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending && (
            <Loader variant="spinner" size={16} className="mr-2" />
          )}
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
