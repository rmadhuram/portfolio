"use client";
import { useActionState } from "react";
import { login } from "@/lib/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm">
        Password
        <input name="password" type="password" required autoFocus className="mt-1 w-full rounded border border-border bg-background px-3 py-2" />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="w-full rounded bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
