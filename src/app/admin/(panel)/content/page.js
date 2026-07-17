import { desc } from "drizzle-orm";
import { db } from "@/db";
import { caseGallery, faqs, profile, services, testimonials } from "@/db/schema";
import EntityManager from "@/components/admin/EntityManager";
import ProfileEditor from "@/components/admin/ProfileEditor";
import {
  deleteCase,
  deleteFaq,
  deleteService,
  deleteTestimonial,
  upsertCase,
  upsertFaq,
  upsertService,
  upsertTestimonial,
} from "@/app/admin/actions/content";

export const dynamic = "force-dynamic";

// Serialize a jsonb [{title,url}] array into the "Title | URL" per-line
// textarea format the server action parses (same idiom as conditions).
const refLines = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((r) => [r.title, r.url].filter(Boolean).join(" | "))
    .join("\n");

const MODE_OPTIONS = [
  { value: "online", label: "Online" },
  { value: "clinic", label: "Clinic" },
  { value: "both", label: "Both" },
];

const FAQ_CATEGORIES = [
  { value: "About homoeopathy", label: "About homoeopathy" },
  { value: "Booking & payment", label: "Booking & payment" },
  { value: "Consultations", label: "Consultations" },
];

export default async function AdminContent() {
  const [prof, svc, faqRows, tmRows, caseRows] = await Promise.all([
    db.select().from(profile).limit(1).then((r) => r[0] || null).catch(() => null),
    db.select().from(services).orderBy(services.sortOrder, services.id).catch(() => []),
    db.select().from(faqs).orderBy(faqs.sortOrder, faqs.id).catch(() => []),
    db.select().from(testimonials).orderBy(testimonials.sortOrder, desc(testimonials.id)).catch(() => []),
    db.select().from(caseGallery).orderBy(caseGallery.sortOrder, desc(caseGallery.id)).catch(() => []),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="font-display text-2xl text-sage-deep font-semibold">
        Content editors
      </h1>

      <section>
        <h2 className="font-semibold text-ink mb-3">Profile &amp; hero</h2>
        <ProfileEditor profile={prof} />
      </section>

      <EntityManager
        title="Services"
        items={svc}
        upsertAction={upsertService}
        deleteAction={deleteService}
        addLabel="Add service"
        columns={[
          { key: "title", label: "Title" },
          { key: "feeInr", label: "Fee", format: "rupees" },
          { key: "durationMinutes", label: "Mins" },
          { key: "mode", label: "Mode" },
          { key: "active", label: "Active", format: "bool" },
        ]}
        fields={[
          { name: "title", label: "Title", fullWidth: true },
          { name: "titleHi", label: "Title (Hindi)", fullWidth: true },
          { name: "description", label: "Description", type: "textarea", fullWidth: true },
          { name: "descriptionHi", label: "Description (Hindi)", type: "textarea", fullWidth: true },
          { name: "durationMinutes", label: "Duration (min)", type: "number" },
          { name: "feeInr", label: "Fee (₹)", type: "number" },
          { name: "mode", label: "Mode", type: "select", options: MODE_OPTIONS },
          { name: "sortOrder", label: "Sort order", type: "number" },
          { name: "isFollowUp", label: "Follow-up service", type: "checkbox" },
          { name: "active", label: "Active", type: "checkbox", defaultChecked: true },
        ]}
      />

      <EntityManager
        title="FAQs"
        items={faqRows.map((f) => ({ ...f, references: refLines(f.references) }))}
        upsertAction={upsertFaq}
        deleteAction={deleteFaq}
        addLabel="Add FAQ"
        columns={[
          { key: "question", label: "Question" },
          { key: "category", label: "Category" },
          { key: "published", label: "Published", format: "bool" },
        ]}
        fields={[
          { name: "question", label: "Question", fullWidth: true },
          { name: "questionHi", label: "Question (Hindi)", fullWidth: true },
          { name: "answer", label: "Answer", type: "textarea", fullWidth: true },
          { name: "answerHi", label: "Answer (Hindi)", type: "textarea", fullWidth: true },
          { name: "category", label: "Category", type: "select", options: FAQ_CATEGORIES },
          {
            name: "references",
            label: "Sources / references",
            type: "textarea",
            hint: "Optional. One per line: Title | URL",
            fullWidth: true,
          },
          { name: "sortOrder", label: "Sort order", type: "number" },
          { name: "published", label: "Published", type: "checkbox", defaultChecked: true },
        ]}
      />

      <EntityManager
        title="Testimonials"
        items={tmRows}
        upsertAction={upsertTestimonial}
        deleteAction={deleteTestimonial}
        addLabel="Add testimonial"
        columns={[
          { key: "patientName", label: "Patient" },
          { key: "rating", label: "Rating" },
          { key: "published", label: "Published", format: "bool" },
        ]}
        fields={[
          { name: "patientName", label: "Patient name / initials" },
          { name: "rating", label: "Rating (1–5)", type: "number" },
          { name: "text", label: "Testimonial", type: "textarea", fullWidth: true },
          { name: "textHi", label: "Testimonial (Hindi)", type: "textarea", fullWidth: true },
          { name: "condition", label: "Condition (for filter chips)", hint: "e.g. PCOS, Migraine — optional" },
          { name: "videoUrl", label: "Video URL", hint: "YouTube link embeds; other links open in a new tab. Optional." },
          { name: "photo", label: "Photo", type: "image", fullWidth: true },
          { name: "sortOrder", label: "Sort order", type: "number" },
          { name: "consentConfirmed", label: "Consent obtained", type: "checkbox" },
          { name: "published", label: "Published", type: "checkbox" },
        ]}
      />

      <EntityManager
        title="Success stories (before / after)"
        items={caseRows}
        upsertAction={upsertCase}
        deleteAction={deleteCase}
        addLabel="Add case"
        columns={[
          { key: "condition", label: "Condition" },
          { key: "consentConfirmed", label: "Consent", format: "bool" },
          { key: "published", label: "Published", format: "bool" },
        ]}
        fields={[
          { name: "condition", label: "Condition treated", fullWidth: true },
          { name: "conditionHi", label: "Condition (Hindi)", fullWidth: true },
          { name: "description", label: "Description", type: "textarea", fullWidth: true },
          { name: "descriptionHi", label: "Description (Hindi)", type: "textarea", fullWidth: true },
          { name: "beforeImage", label: "Before image", type: "image" },
          { name: "afterImage", label: "After image", type: "image" },
          { name: "treatmentDuration", label: "Treatment duration" },
          { name: "city", label: "City", hint: "Optional — e.g. Nagpur" },
          { name: "sortOrder", label: "Sort order", type: "number" },
          { name: "consentConfirmed", label: "Signed consent obtained (required to publish)", type: "checkbox", fullWidth: true },
          { name: "published", label: "Published", type: "checkbox" },
        ]}
      />
    </div>
  );
}
