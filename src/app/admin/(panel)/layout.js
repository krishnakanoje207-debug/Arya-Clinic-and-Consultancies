import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { logoutAction } from "@/app/admin/actions/auth";
import AdminMobileNav from "@/components/admin/AdminMobileNav";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

/* Grouped by how often the doctor actually needs each page: the day's work
 * first, the website in the middle, one-time setup last. Every page that
 * existed is still here — only the ordering and the headings changed. */
const NAV = [
  [
    "Today",
    [
      ["/admin", "Dashboard"],
      ["/admin/queue", "Patient management"],
      ["/admin/appointments", "Appointments"],
      ["/admin/patients", "Patients"],
      ["/admin/medications", "Medications"],
    ],
  ],
  ["Schedule", [["/admin/availability", "Hours & days off"]]],
  [
    "Website",
    [
      ["/admin/content", "Content"],
      ["/admin/conditions", "Conditions"],
      ["/admin/research", "Research"],
      ["/admin/quiz-leads", "Quiz leads"],
    ],
  ],
  [
    "Setup",
    [
      ["/admin/settings", "Settings"],
      ["/admin/templates", "Message templates"],
      ["/admin/account", "Account"],
    ],
  ],
];

export default async function AdminPanelLayout({ children }) {
  const session = await requireAdmin();
  if (!session.authed) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-cream text-ink">
      <AdminMobileNav
        links={NAV}
        email={session.email}
        logoutAction={logoutAction}
      />
      <div className="flex">
        <aside className="w-56 shrink-0 border-r border-[var(--border)] min-h-screen p-4 hidden md:flex md:flex-col">
          <div>
            <Link href="/" className="font-display text-lg text-sage-deep font-semibold">
              Dr. Seema
            </Link>
            <p className="text-xs text-ink-soft mb-6">Admin panel</p>
            <nav className="space-y-5">
              {NAV.map(([group, items]) => (
                <div key={group}>
                  <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
                    {group}
                  </p>
                  <div className="space-y-1">
                    {items.map(([href, label]) => (
                      <Link
                        key={href}
                        href={href}
                        className="block px-3 py-2 rounded-lg text-sm hover:bg-sage-soft"
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
          <div className="mt-auto pt-8">
            <p className="text-xs text-ink-soft break-all mb-2">{session.email}</p>
            <form action={logoutAction}>
              <button type="submit" className="btn-ghost text-xs py-1 px-3">
                Sign out
              </button>
            </form>
          </div>
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
