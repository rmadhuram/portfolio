import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto mt-16 w-full max-w-sm rounded-lg border border-border bg-card p-6">
      <h1 className="text-lg font-semibold">Sign in</h1>
      <LoginForm next={next ?? "/admin"} />
    </div>
  );
}
