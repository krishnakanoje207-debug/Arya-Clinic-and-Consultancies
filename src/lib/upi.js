import QRCode from "qrcode";
import { buildUpiString } from "@/lib/booking";

/**
 * Render a UPI payment QR as a data URL. The QR encodes the same
 * upi://pay string the mobile "Pay via UPI app" button uses, so desktop
 * users (where the deep link won't resolve) scan instead. The copyable UPI
 * ID is always shown alongside as a final fallback.
 */
export async function upiQrDataUrl({ upiId, payeeName, amountInr, note }) {
  const payload = buildUpiString({ upiId, payeeName, amountInr, note });
  return QRCode.toDataURL(payload, { margin: 1, width: 320 });
}

export { buildUpiString };
