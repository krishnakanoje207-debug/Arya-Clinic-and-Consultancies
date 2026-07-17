"use server";

import { db } from "@/db";
import { quizLeads } from "@/db/schema";
import { quizLeadSchema } from "@/lib/validation";
import { getQuiz, scoreQuiz } from "@/lib/quiz-data";
import { dispatchLeadNotification } from "@/lib/notify";

/**
 * Capture an OPTIONAL phone lead from a self-assessment quiz. The quiz can be
 * taken with no DB at all; this is the only write. The score and result are
 * recomputed server-side from the raw answers (never trusted from the
 * client). If the DB is unreachable we return { ok:false, reason:"unavailable" }
 * so the UI can fall back to "please call / WhatsApp us" instead of crashing.
 */
export async function submitQuizLead(input) {
  const parsed = quizLeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };

  const { quizSlug, phone, answers } = parsed.data;
  const quiz = getQuiz(quizSlug);
  if (!quiz || answers.length !== quiz.questions.length) {
    return { ok: false, reason: "invalid" };
  }

  const { score, maxScore, resultKey } = scoreQuiz(quiz, answers);
  const lead = {
    quizSlug,
    quizName: quiz.name,
    phone: phone.replace(/[ \-]/g, ""),
    resultKey,
    score,
    maxScore,
  };

  try {
    await db.insert(quizLeads).values(lead);
  } catch (err) {
    console.error("[quiz] lead insert failed:", err?.message || err);
    return { ok: false, reason: "unavailable" };
  }

  await dispatchLeadNotification(lead);
  return { ok: true };
}
