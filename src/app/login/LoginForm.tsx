"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/icons";
import { Input } from "@/components/ui/Field";

/** Password → POST /api/auth/login → HTTP-only session cookie → dashboard. */
export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading || !password) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        router.replace("/projects");
        router.refresh();
        return;
      }
      setError(response.status === 401 ? "Incorrect password. Try again." : "Could not sign in. Please try again.");
    } catch {
      setError("Network error — could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Password"
        autoComplete="current-password"
        autoFocus
        required
        aria-label="Password"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={loading || !password}>
        {loading && <Spinner className="h-3.5 w-3.5" />}
        {loading ? "Signing in…" : "Enter"}
      </Button>
    </form>
  );
}
