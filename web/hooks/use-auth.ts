import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import type { LoginRequest, RegisterRequest } from "@/types";

/**
 * Hook wrappers around the AuthProvider actions for use in forms.
 * These return TanStack Query mutation objects for loading/error states.
 */

export function useLogin() {
  const { login } = useAuth();
  return useMutation({
    mutationFn: (req: LoginRequest) => login(req),
  });
}

export function useRegister() {
  const { register } = useAuth();
  return useMutation({
    mutationFn: (req: RegisterRequest) => register(req),
  });
}

export function useLogout() {
  const { logout } = useAuth();
  return useMutation({
    mutationFn: () => logout(),
  });
}
