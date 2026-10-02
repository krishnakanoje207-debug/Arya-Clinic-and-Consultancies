"use client";

import { useState, useTransition } from "react";
import {
  cancelMedicationOrder,
  markMedicationShipped,
} from "@/app/admin/actions/medications";

const STATUS_STYLE = {
  pending_payment: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-800",
  shipped: "bg-sage-soft text-sage-deep",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABEL = { shipped: "delivery scheduled" };

/** The block the doctor pastes into her courier booking email. */
function deliveryText({ patientName, patientPhone, address, orderId }) {
  return [
    `Name: ${patientName || ""}`,
    `Phone: +91 ${patientPhone || ""}`,
    "Address:",
    address || "(no address given)",
    `Order ref: #${orderId}`,
  ].join("\n");
}

/** One admin medication-order row. Actions depend on status: pending_payment →
 * cancel only (the Razorpay webhook marks it paid automatically); paid →
 * "Schedule delivery" opens the patient's delivery details to copy, then
 * "Mark delivery scheduled" (optional courier ref) — or cancel; a scheduled
 * delivery (status shipped) is terminal. Surfaces a failed action with an
 * alert, like AppointmentRow. */
export default function MedicationRow({ order, patientName, patientPhone, nextLabel, createdLabel, receiptUrl }) {
  const [pending, startTransition] = useTransition();
  const [courierRef, setCourierRef] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [copied, setCopied] = useState(false);
  const details = deliveryText({ patientName, patientPhone, address: order.address, orderId: order.id });

  async function copy() {
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
    } catch {
      alert("Copy failed — select the text and copy it manually.");
    }
  }

  function run(fn) {
    startTransition(async () => {
      const res = await fn();
      if (res && res.ok === false) {
        alert(
          "That action is no longer valid — the order's status may have changed. Refresh and try again.",
        );
      }
    });
  }

  const options = Array.isArray(order.options) ? order.options : [];

  return (
    <>
      <tr className="border-t border-[var(--border)] align-top text-sm">
        <td className="p-3">
          <div className="font-semibold">{order.title}</div>
          <div className="text-xs text-ink-soft">#{order.id} · {createdLabel}</div>
        </td>
        <td className="p-3">
          <div>{patientName || "—"}</div>
          <div className="text-xs text-ink-soft">{patientPhone}</div>
          {nextLabel && (
            <div className="text-xs text-ink-soft mt-1">Next visit: {nextLabel}</div>
          )}
        </td>
        <td className="p-3">
          <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[order.status]}`}>
            {STATUS_LABEL[order.status] || order.status.replace("_", " ")}
          </span>
          {order.razorpayPaymentId && (
            <div className="text-[11px] text-ink-soft mt-1 break-all">
              Payment: {order.razorpayPaymentId}
            </div>
          )}
          {order.razorpayRefundId && (
            <div className="text-[11px] text-terracotta-deep mt-1 break-all">
              Refunded: {order.razorpayRefundId}
            </div>
          )}
          {receiptUrl && (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener"
              className="text-[11px] text-sage-deep underline mt-1 inline-block"
            >
              Receipt
            </a>
          )}
        </td>
        <td className="p-3">
          {order.chosenDurationDays ? (
            <div>
              {order.chosenDurationDays} days · ₹{order.amountInr}
            </div>
          ) : (
            <div className="text-ink-soft">
              {options.map((o) => `${o.days}d ₹${o.amountInr}`).join(" · ") || "—"}
            </div>
          )}
        </td>
        <td className="p-3 text-ink-soft max-w-[16rem] whitespace-pre-wrap break-words">
          {order.address || "—"}
          {order.status === "shipped" && order.courierRef && (
            <div className="text-xs mt-1">Courier: {order.courierRef}</div>
          )}
        </td>
        <td className="p-3 text-right whitespace-nowrap">
          {order.status === "pending_payment" && (
            <button
              onClick={() => run(() => cancelMedicationOrder(order.id))}
              disabled={pending}
              className="text-xs py-1 px-3 text-red-600 hover:underline"
            >
              Cancel
            </button>
          )}
          {order.status === "paid" && (
            <div className="space-x-1">
              <button
                onClick={() => setScheduling((v) => !v)}
                className="btn-primary text-xs py-1 px-3"
              >
                {scheduling ? "Hide delivery details" : "Schedule delivery"}
              </button>
              <button
                onClick={() => run(() => cancelMedicationOrder(order.id))}
                disabled={pending}
                className="text-xs py-1 px-3 text-red-600 hover:underline"
              >
                Cancel
              </button>
            </div>
          )}
          {order.status === "shipped" && (
            <span className="text-xs text-ink-soft">
              {order.courierRef
                ? `Delivery scheduled · ${order.courierRef}`
                : "Delivery scheduled"}
            </span>
          )}
          {order.status === "cancelled" && (
            <span className="text-xs text-ink-soft">Cancelled</span>
          )}
        </td>
      </tr>
      {order.status === "paid" && scheduling && (
        <tr className="bg-cream-deep text-sm">
          <td colSpan={6} className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold mb-1">Delivery details</p>
                <textarea
                  readOnly
                  rows={6}
                  value={details}
                  onFocus={(e) => e.target.select()}
                  className="w-full rounded border border-[var(--border)] px-2 py-1 font-mono text-xs bg-white"
                />
                <button onClick={copy} className="btn-ghost text-xs py-1 px-3 mt-2">
                  {copied ? "Copied" : "Copy details"}
                </button>
                <p className="text-xs text-ink-soft mt-1">
                  Paste into your delivery booking email.
                </p>
              </div>
              <div>
                <p className="font-semibold mb-1">Once the delivery is booked</p>
                <input
                  value={courierRef}
                  onChange={(e) => setCourierRef(e.target.value)}
                  placeholder="Courier / tracking ref (optional)"
                  className="w-full rounded border border-[var(--border)] px-2 py-1 text-xs"
                />
                <button
                  onClick={() => run(() => markMedicationShipped(order.id, courierRef))}
                  disabled={pending}
                  className="btn-primary text-xs py-1 px-3 mt-2"
                >
                  {pending ? "Saving…" : "Mark delivery scheduled"}
                </button>
                <p className="text-xs text-ink-soft mt-1">
                  The patient sees &ldquo;Delivery scheduled&rdquo; (and the reference,
                  if given) on their dashboard.
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
