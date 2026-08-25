import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import LoginForm from "./LoginForm";
import { LogoMark } from "@/components/icons";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/projects");

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-xs animate-fade-in">
        <div className="rounded-xl border border-border bg-surface px-6 py-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <LogoMark className="h-10 w-10 text-accent-fg" />
            <div>
              <h1 className="text-base font-semibold tracking-tight">Project Hub</h1>
              <p className="mt-1 text-xs text-muted">Enter password</p>
            </div>
          </div>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
        <p className="mt-4 text-center font-mono text-[10.5px] text-muted/50">
          internal tool · shared access
        </p>
      </div>
    </main>
  );
}
