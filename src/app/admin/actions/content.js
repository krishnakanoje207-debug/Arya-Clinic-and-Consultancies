"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  availabilityRules,
  caseGallery,
  conditions,
  faqs,
  profile,
  services,
  slotOverrides,
  testimonials,
} from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

async function guard() {
  const s = await requireAdmin();
  if (!s.authed) throw new Error("Unauthorized");
}

const str = (fd, k) => {
  const v = fd.get(k);
  return v === null || v === "" ? null : String(v);
};
const int = (fd, k) => {
  const v = fd.get(k);
  return v === null || v === "" ? null : Number(v);
};
const bool = (fd, k) => Boolean(fd.get(k));
const refresh = () => {
  revalidatePath("/");
  revalidatePath("/testimonials");
  revalidatePath("/admin/content");
};

/* ---------- Profile (single row) ---------- */
export async function saveProfile(prevState, fd) {
  await guard();
  const degrees = String(fd.get("degrees") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, institution, year] = line.split("|").map((x) => x?.trim());
      return { title, institution: institution || "", year: year || "" };
    });
  const stats = String(fd.get("stats") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, value] = line.split("|").map((x) => x?.trim());
      return { label, value: value || "" };
    });
  const memberships = String(fd.get("memberships") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const values = {
    name: str(fd, "name") || "Dr. Seema",
    tagline: str(fd, "tagline"),
    taglineHi: str(fd, "taglineHi"),
    bio: str(fd, "bio"),
    bioHi: str(fd, "bioHi"),
    degrees,
    stats,
    registrationNumber: str(fd, "registrationNumber"),
    registrationCouncil: str(fd, "registrationCouncil"),
    memberships,
    yearsExperience: int(fd, "yearsExperience"),
    heroImage: str(fd, "heroImage"),
    aboutImage: str(fd, "aboutImage"),
    updatedAt: new Date(),
  };

  const [existing] = await db.select({ id: profile.id }).from(profile).limit(1);
  if (existing) {
    await db.update(profile).set(values).where(eq(profile.id, existing.id));
  } else {
    await db.insert(profile).values(values);
  }
  refresh();
  return { ok: true };
}

/* ---------- Services ---------- */
export async function upsertService(prevState, fd) {
  await guard();
  const id = int(fd, "id");
  const values = {
    title: str(fd, "title") || "Service",
    titleHi: str(fd, "titleHi"),
    description: str(fd, "description"),
    descriptionHi: str(fd, "descriptionHi"),
    durationMinutes: int(fd, "durationMinutes") || 30,
    feeInr: int(fd, "feeInr") || 0,
    mode: str(fd, "mode") || "online",
    isFollowUp: bool(fd, "isFollowUp"),
    sortOrder: int(fd, "sortOrder") || 0,
    active: bool(fd, "active"),
  };
  if (id) await db.update(services).set(values).where(eq(services.id, id));
  else await db.insert(services).values(values);
  refresh();
  return { ok: true };
}
export async function deleteService(id) {
  await guard();
  await db.delete(services).where(eq(services.id, Number(id)));
  refresh();
}

/* ---------- FAQs ---------- */
export async function upsertFaq(prevState, fd) {
  await guard();
  const id = int(fd, "id");
  // references: one "title | url" per line (same idiom as conditions).
  const references = lines(fd, "references").map((line) => {
    const [title, url] = line.split("|").map((x) => x?.trim());
    return { title: title || "", url: url || "" };
  });
  const values = {
    question: str(fd, "question") || "",
    questionHi: str(fd, "questionHi"),
    answer: str(fd, "answer") || "",
    answerHi: str(fd, "answerHi"),
    category: str(fd, "category") || "About homoeopathy",
    references,
    sortOrder: int(fd, "sortOrder") || 0,
    published: bool(fd, "published"),
  };
  if (id) await db.update(faqs).set(values).where(eq(faqs.id, id));
  else await db.insert(faqs).values(values);
  refresh();
  return { ok: true };
}
export async function deleteFaq(id) {
  await guard();
  await db.delete(faqs).where(eq(faqs.id, Number(id)));
  refresh();
}

/* ---------- Testimonials ---------- */
export async function upsertTestimonial(prevState, fd) {
  await guard();
  const id = int(fd, "id");
  const values = {
    patientName: str(fd, "patientName") || "Anonymous",
    text: str(fd, "text") || "",
    textHi: str(fd, "textHi"),
    rating: int(fd, "rating"),
    photo: str(fd, "photo"),
    videoUrl: str(fd, "videoUrl"),
    condition: str(fd, "condition"),
    consentConfirmed: bool(fd, "consentConfirmed"),
    published: bool(fd, "published"),
    sortOrder: int(fd, "sortOrder") || 0,
  };
  if (id) await db.update(testimonials).set(values).where(eq(testimonials.id, id));
  else await db.insert(testimonials).values(values);
  refresh();
  return { ok: true };
}
export async function deleteTestimonial(id) {
  await guard();
  await db.delete(testimonials).where(eq(testimonials.id, Number(id)));
  refresh();
}

/* ---------- Case gallery (before/after) ---------- */
export async function upsertCase(prevState, fd) {
  await guard();
  const id = int(fd, "id");
  const consent = bool(fd, "consentConfirmed");
  const values = {
    condition: str(fd, "condition") || "",
    conditionHi: str(fd, "conditionHi"),
    description: str(fd, "description"),
    descriptionHi: str(fd, "descriptionHi"),
    beforeImage: str(fd, "beforeImage"),
    afterImage: str(fd, "afterImage"),
    treatmentDuration: str(fd, "treatmentDuration"),
    city: str(fd, "city"),
    consentConfirmed: consent,
    // Cannot publish without consent (compliance — plan §6).
    published: consent && bool(fd, "published"),
    sortOrder: int(fd, "sortOrder") || 0,
  };
  if (id) await db.update(caseGallery).set(values).where(eq(caseGallery.id, id));
  else await db.insert(caseGallery).values(values);
  refresh();
  return { ok: true };
}
export async function deleteCase(id) {
  await guard();
  await db.delete(caseGallery).where(eq(caseGallery.id, Number(id)));
  refresh();
}

/* ---------- Conditions (detail pages) ---------- */
// One-per-line textareas parsed into jsonb arrays. Field order per line:
//   symptoms / causes: text | text_hi
//   faqs:              q | q_hi | a | a_hi
//   references:        title | url
const lines = (fd, k) =>
  String(fd.get(k) || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export async function upsertCondition(prevState, fd) {
  await guard();
  const id = int(fd, "id");
  const textPairs = (k) =>
    lines(fd, k).map((line) => {
      const [text, text_hi] = line.split("|").map((x) => x?.trim());
      return { text, text_hi: text_hi || "" };
    });
  const faqRows = lines(fd, "faqs").map((line) => {
    const [q, q_hi, a, a_hi] = line.split("|").map((x) => x?.trim());
    return { q: q || "", q_hi: q_hi || "", a: a || "", a_hi: a_hi || "" };
  });
  const refRows = lines(fd, "references").map((line) => {
    const [title, url] = line.split("|").map((x) => x?.trim());
    return { title: title || "", url: url || "" };
  });

  const name = str(fd, "name") || "Condition";
  const slug = slugify(str(fd, "slug") || name);
  if (!slug) return { ok: false, error: "A URL slug is required" };

  const values = {
    slug,
    name,
    nameHi: str(fd, "nameHi"),
    intro: str(fd, "intro"),
    introHi: str(fd, "introHi"),
    overview: str(fd, "overview"),
    overviewHi: str(fd, "overviewHi"),
    symptoms: textPairs("symptoms"),
    causes: textPairs("causes"),
    approach: str(fd, "approach"),
    approachHi: str(fd, "approachHi"),
    faqs: faqRows,
    references: refRows,
    cardImage: str(fd, "cardImage"),
    sortOrder: int(fd, "sortOrder") || 0,
    published: bool(fd, "published"),
  };

  try {
    if (id) await db.update(conditions).set(values).where(eq(conditions.id, id));
    else await db.insert(conditions).values(values);
  } catch {
    return { ok: false, error: "Could not save — is the URL slug unique?" };
  }
  refresh();
  revalidatePath(`/conditions/${slug}`);
  revalidatePath("/admin/conditions");
  return { ok: true };
}
export async function deleteCondition(id) {
  await guard();
  await db.delete(conditions).where(eq(conditions.id, Number(id)));
  refresh();
  revalidatePath("/admin/conditions");
}

/* ---------- Availability rules & overrides ---------- */
export async function upsertRule(prevState, fd) {
  await guard();
  const id = int(fd, "id");
  const values = {
    weekday: int(fd, "weekday") ?? 1,
    startTime: str(fd, "startTime") || "10:00",
    endTime: str(fd, "endTime") || "13:00",
    slotLengthMinutes: int(fd, "slotLengthMinutes") || 30,
    mode: str(fd, "mode") || "online",
    active: bool(fd, "active"),
  };
  if (id) await db.update(availabilityRules).set(values).where(eq(availabilityRules.id, id));
  else await db.insert(availabilityRules).values(values);
  revalidatePath("/admin/availability");
  return { ok: true };
}
export async function deleteRule(id) {
  await guard();
  await db.delete(availabilityRules).where(eq(availabilityRules.id, Number(id)));
  revalidatePath("/admin/availability");
}
export async function upsertOverride(prevState, fd) {
  await guard();
  const values = {
    onDate: str(fd, "onDate"),
    kind: str(fd, "kind") || "blocked",
    startTime: str(fd, "startTime"),
    endTime: str(fd, "endTime"),
    slotLengthMinutes: int(fd, "slotLengthMinutes"),
    mode: str(fd, "mode"),
    note: str(fd, "note"),
  };
  if (!values.onDate) return { ok: false, error: "Date required" };
  await db.insert(slotOverrides).values(values);
  revalidatePath("/admin/availability");
  return { ok: true };
}
export async function deleteOverride(id) {
  await guard();
  await db.delete(slotOverrides).where(eq(slotOverrides.id, Number(id)));
  revalidatePath("/admin/availability");
}
