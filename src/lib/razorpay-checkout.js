/**
 * Client-only helper: lazily load Razorpay Checkout and open it against a
 * server-created order. Imported by BookingFlow and MedicationOrderCard so the
 * script loads on demand (never in the initial bundle) and only when the
 * patient reaches the payment step.
 */

let scriptPromise = null;

function loadCheckoutScript() {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Razorpay Checkout"));
    };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Open Razorpay Checkout. `onSuccess` fires from the handler once the payment
 * is submitted (the webhook is what actually confirms — the caller then polls).
 * `onDismiss` fires when the patient closes the modal without paying.
 */
export async function openRazorpayCheckout({
  keyId,
  orderId,
  amountInr,
  name,
  description,
  prefill,
  onSuccess,
  onDismiss,
  onFailed,
}) {
  await loadCheckoutScript();
  const rzp = new window.Razorpay({
    key: keyId,
    order_id: orderId,
    amount: amountInr * 100,
    currency: "INR",
    name: name || "Consultation",
    description: description || "",
    prefill: prefill || {},
    handler: () => onSuccess && onSuccess(),
    modal: { ondismiss: () => onDismiss && onDismiss() },
  });
  if (onFailed) rzp.on("payment.failed", (resp) => onFailed(resp));
  rzp.open();
}
