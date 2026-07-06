import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import LoginForm from "@/components/admin/LoginForm";

export const metadata = { title: "Admin sign in" };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await requireAdmin();
  if (session.authed) redirect("/admin");

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="card-warm p-8 w-full max-w-sm">
        <h1 className="font-display text-2xl text-sage-deep font-semibold mb-1">
          Dr. Seema — Admin
        </h1>
        <p className="text-sm text-ink-soft mb-6">Sign in to manage the site.</p>
        <LoginForm />
      </div>
    </div>
  );
}
