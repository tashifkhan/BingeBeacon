import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRegister } from "@/hooks/use-auth";
import { AuthShell, AuthError, PasswordInput } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/motion/loader";
import type { AxiosError } from "axios";
import type { ApiError } from "@/types";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await registerMutation.mutateAsync({ email, username, password });
      await navigate({ to: "/" });
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setError(
        axiosErr.response?.data?.error?.message ??
          "Registration failed. Please try again."
      );
    }
  }

  return (
    <AuthShell
      subtitle="Create your account"
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-primary transition-colors can-hover:hover:text-primary/80"
          >
            Sign in
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
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            enterKeyHint="next"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.currentTarget.value)}
            required
            minLength={3}
            maxLength={30}
            className="h-12 rounded-xl border-border/60 bg-muted/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
          />
        </div>

        <AuthError message={error} />

        <Button
          type="submit"
          className="h-12 w-full rounded-xl font-semibold glow-amber press can-hover:hover:glow-amber-strong"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending && (
            <Loader variant="spinner" size={16} className="mr-2" />
          )}
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
