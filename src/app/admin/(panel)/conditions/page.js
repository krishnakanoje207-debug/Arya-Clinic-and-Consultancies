import { db } from "@/db";
import { conditions } from "@/db/schema";
import EntityManager from "@/components/admin/EntityManager";
import { deleteCondition, upsertCondition } from "@/app/admin/actions/content";

export const dynamic = "force-dynamic";

// Serialize jsonb arrays back into the one-per-line "a | b" textarea format
// the server action parses, so editing an existing row pre-fills correctly.
const pairLines = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((x) => [x.text, x.text_hi].filter(Boolean).join(" | "))
    .join("\n");
const faqLines = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((f) => [f.q, f.q_hi, f.a, f.a_hi].map((v) => v || "").join(" | "))
    .join("\n");
const refLines = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((r) => [r.title, r.url].filter(Boolean).join(" | "))
    .join("\n");

export default async function AdminConditions() {
  const rows = await db
    .select()
    .from(conditions)
    .orderBy(conditions.sortOrder, conditions.id)
    .catch(() => []);

  const items = rows.map((c) => ({
    ...c,
    symptoms: pairLines(c.symptoms),
    causes: pairLines(c.causes),
    faqs: faqLines(c.faqs),
    references: refLines(c.references),
  }));

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-sage-deep font-semibold">
        Conditions
      </h1>
      <p className="text-sm text-ink-soft max-w-2xl">
        Detail pages at <code>/conditions/[slug]</code>. Keep copy educational
        and claims-neutral — no cure guarantees or success percentages.
      </p>
      <EntityManager
        title="Condition pages"
        items={items}
        upsertAction={upsertCondition}
        deleteAction={deleteCondition}
        addLabel="Add condition"
        columns={[
          { key: "name", label: "Name" },
          { key: "slug", label: "Slug" },
          { key: "sortOrder", label: "Order" },
          { key: "published", label: "Published", format: "bool" },
        ]}
        fields={[
          { name: "name", label: "Name", fullWidth: true },
          { name: "nameHi", label: "Name (Hindi)", fullWidth: true },
          {
            name: "slug",
            label: "URL slug",
            hint: "url-safe, e.g. pcos — leave blank to generate from the name",
            fullWidth: true,
          },
          { name: "intro", label: "Intro (short hero paragraph)", type: "textarea", fullWidth: true },
          { name: "introHi", label: "Intro (Hindi)", type: "textarea", fullWidth: true },
          { name: "overview", label: "Overview", type: "textarea", fullWidth: true },
          { name: "overviewHi", label: "Overview (Hindi)", type: "textarea", fullWidth: true },
          {
            name: "symptoms",
            label: "Symptoms",
            type: "textarea",
            hint: "One per line: English | Hindi",
            fullWidth: true,
          },
          {
            name: "causes",
            label: "Common causes",
            type: "textarea",
            hint: "One per line: English | Hindi",
            fullWidth: true,
          },
          { name: "approach", label: "How homoeopathy helps", type: "textarea", fullWidth: true },
          { name: "approachHi", label: "How homoeopathy helps (Hindi)", type: "textarea", fullWidth: true },
          {
            name: "faqs",
            label: "FAQs",
            type: "textarea",
            hint: "One per line: Question | Question (Hindi) | Answer | Answer (Hindi)",
            fullWidth: true,
          },
          {
            name: "references",
            label: "Sources / references",
            type: "textarea",
            hint: "One per line: Title | URL",
            fullWidth: true,
          },
          {
            name: "cardImage",
            label: "Card photo (homepage “What We Treat”)",
            type: "image",
            hint: "Shown on the homepage condition card. Leave blank for a default wellness photo.",
            fullWidth: true,
          },
          { name: "sortOrder", label: "Sort order", type: "number" },
          { name: "published", label: "Published", type: "checkbox" },
        ]}
      />
    </div>
  );
}
