import { desc } from "drizzle-orm";
import { db } from "@/db";
import { researchItems } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import EntityManager from "@/components/admin/EntityManager";
import { deleteResearch, upsertResearch } from "@/app/admin/actions/research";

export const dynamic = "force-dynamic";

export default async function AdminResearch() {
  const [items, settings] = await Promise.all([
    db.select().from(researchItems).orderBy(researchItems.sortOrder, desc(researchItems.id)).catch(() => []),
    getSettings(["research_published"]),
  ]);

  const fields = [
    { name: "title", label: "Title", fullWidth: true },
    { name: "titleHi", label: "Title (Hindi)", fullWidth: true },
    {
      name: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "article", label: "Article" },
        { value: "paper", label: "Paper" },
        { value: "video", label: "Video" },
        { value: "pdf", label: "PDF" },
      ],
    },
    { name: "sortOrder", label: "Sort order", type: "number" },
    { name: "linkOrFile", label: "Link or file URL", fullWidth: true },
    { name: "coverImage", label: "Cover image", type: "image", fullWidth: true },
    { name: "summary", label: "Summary", type: "textarea", fullWidth: true },
    { name: "summaryHi", label: "Summary (Hindi)", type: "textarea", fullWidth: true },
    { name: "visible", label: "Visible", type: "checkbox", defaultChecked: true },
  ];

  const columns = [
    { key: "title", label: "Title" },
    { key: "type", label: "Type" },
    { key: "visible", label: "Visible", format: "bool" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-sage-deep font-semibold">
        Research materials
      </h1>
      {!settings.research_published && (
        <div className="card-warm p-4 text-sm text-ink-soft border-l-4 border-terracotta">
          The research section is currently <strong>hidden</strong> from the
          public site. Turn on “Publish the Research section” in{" "}
          <a href="/admin/settings" className="text-sage-deep underline">
            Settings
          </a>{" "}
          when ready — it appears only when published <em>and</em> at least one
          visible item exists.
        </div>
      )}
      <EntityManager
        title="Items"
        items={items}
        fields={fields}
        columns={columns}
        upsertAction={upsertResearch}
        deleteAction={deleteResearch}
        addLabel="Add material"
      />
    </div>
  );
}
