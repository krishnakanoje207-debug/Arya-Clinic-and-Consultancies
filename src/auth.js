import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";

/**
 * Admin-only credentials auth (Auth.js v5). Patients never log in — the
 * only account is the doctor/owner seeded by src/db/seed.js. JWT sessions
 * (no DB session table needed); 8h expiry so a forgotten clinic tab
 * doesn't stay signed in for weeks.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/admin/login" },
  callbacks: {
    async redirect({ url, baseUrl }) {
      try {
        const target = new URL(url, baseUrl);
        const base = new URL(baseUrl);
        const targetLength = target.pathname.length + target.search.length;
        if (target.origin === base.origin && targetLength <= 2048) {
          return `${target.pathname}${target.search}${target.hash}`;
        }
      } catch {
        // Fall through to the fixed local destination below.
      }
      return "/admin/login";
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email || "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password || "");
        if (!email || !password) return null;

        let user;
        try {
          [user] = await db
            .select()
            .from(adminUsers)
            .where(eq(adminUsers.email, email));
        } catch {
          return null; // DB unreachable → treat as failed login, not a crash
        }
        // Always run a compare (constant-ish work) even when the user is
        // missing, so response timing doesn't reveal which emails exist.
        const hash =
          user?.passwordHash ||
          "$2a$10$invalidinvalidinvalidinvaliduBOG3yUsvLxDCPYRWEnT1H2rDeIe";
        const ok = await bcrypt.compare(password, hash);
        if (!user || !ok) return null;
        return { id: String(user.id), email: user.email };
      },
    }),
  ],
});
