"use server";

import { submitMedicationPayment } from "@/lib/medications";

/** Record the patient's UPI payment for a medication order (mirrors
 * submitUtrAction for consultations). Thin wrapper over the lib fn — all the
 * validation and ownership checks live there. The doctor verifies the UTR and
 * marks it paid from /admin/medications, same as consultation payments. */
export async function submitMedicationPaymentAction(dashboardToken, payload) {
  return submitMedicationPayment(dashboardToken, payload);
}
