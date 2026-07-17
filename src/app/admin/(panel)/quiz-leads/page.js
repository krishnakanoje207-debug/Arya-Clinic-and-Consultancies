import { desc } from "drizzle-orm";
import { db } from "@/db";
import { quizLeads } from "@/db/schema";
import { formatIst } from "@/lib/time";

export const dynamic = "force-dynamic";

const RESULT_LABEL = {
  low: "Low",
  moderate: "Moderate",
  significant: "Significant",
};
const RESULT_CLASS = {
  low: "bg-sage-soft text-sage-deep",
  moderate: "bg-gold-soft text-ink",
  significant: "bg-terracotta text-white",
};

export default async function AdminQuizLeads() {
  const rows = await db
    .select()
    .from(quizLeads)
    .orderBy(desc(quizLeads.createdAt))
    .limit(500)
    .catch(() => []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-sage-deep font-semibold">
        Quiz leads
      </h1>
      <p className="text-sm text-ink-soft max-w-2xl">
        Optional phone numbers left by visitors after taking a self-assessment.
        Follow up by phone or WhatsApp — these are enquiries, not diagnoses.
      </p>
      {rows.length ? (
        <div className="card-warm overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs uppercase text-ink-soft">
              <tr>
                <th className="p-3">Phone</th>
                <th className="p-3">Quiz</th>
                <th className="p-3">Result</th>
                <th className="p-3">Score</th>
                <th className="p-3">When (IST)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => (
                <tr key={lead.id} className="border-t border-[var(--border)] text-sm">
                  <td className="p-3">
                    <a href={`tel:${lead.phone}`} className="text-sage-deep hover:text-terracotta">
                      {lead.phone}
                    </a>
                  </td>
                  <td className="p-3">{lead.quizName}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${RESULT_CLASS[lead.resultKey] || "bg-sage-soft text-sage-deep"}`}
                    >
                      {RESULT_LABEL[lead.resultKey] || lead.resultKey}
                    </span>
                  </td>
                  <td className="p-3 text-ink-soft">
                    {lead.score}/{lead.maxScore}
                  </td>
                  <td className="p-3 text-ink-soft">{formatIst(lead.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">No quiz leads yet.</p>
      )}
    </div>
  );
}
