"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { auth, signIn, signOut } from "@/auth";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";

/** Credentials login. On success signIn throws NEXT_REDIRECT to /admin —
 * rethrow everything that isn't an auth failure. */
export async function loginAction(prevState, formData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/admin",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw err; // NEXT_REDIRECT on success
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/admin/login" });
}

/** Account module (plan §5): change the admin password. Verifies the
 * current password before accepting the new one. */
export async function changePasswordAction(prevState, formData) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { error: "Not signed in." };

  const current = String(formData.get("current") || "");
  const next = String(formData.get("next") || "");
  const confirm = String(formData.get("confirm") || "");

  if (next.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (next !== confirm) {
    return { error: "New passwords don't match." };
  }

  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email));
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    return { error: "Current password is incorrect." };
  }

  await db
    .update(adminUsers)
    .set({ passwordHash: await bcrypt.hash(next, 10) })
    .where(eq(adminUsers.id, user.id));

  return { ok: true };
}
