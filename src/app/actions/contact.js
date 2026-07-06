"use server";

import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { contactSchema } from "@/lib/validation";

/**
 * Handle a contact-form submission. Honeypot field "company" must stay
 * empty (bots fill it); burst rate-limiting lives in src/proxy.js; zod
 * bounds every field length.
 */
export async function submitContact(prevState, formData) {
  const company = formData.get("company"); // honeypot
  if (company) return { ok: true }; // silently drop bots

  const parsed = contactSchema.safeParse({
    name: String(formData.get("name") || ""),
    message: String(formData.get("message") || ""),
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || ""),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please enter your name and a message." };
  }
  const { name, message, phone, email } = parsed.data;

  await db.insert(contactMessages).values({
    name,
    message,
    phone: phone || null,
    email: email || null,
  });

  return { ok: true };
}
