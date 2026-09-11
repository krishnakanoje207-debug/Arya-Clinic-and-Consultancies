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

/** One admin medication-order row. Actions depend on status: pending_payment →
 * cancel only (the Razorpay webhook marks it paid automatically); paid → mark
 * shipped (optional courier ref) or cancel; shipped is terminal. Surfaces a
 * failed action with an alert, like AppointmentRow. */
export default function MedicationRow({ order, patientName, patientPhone, createdLabel, receiptUrl }) {
  const [pending, startTransition] = useTransition();
  const [courierRef, setCourierRef] = useState("");

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
    <tr className="border-t border-[var(--border)] align-top text-sm">
      <td className="p-3">
        <div className="font-semibold">{order.title}</div>
        <div className="text-xs text-ink-soft">#{order.id} · {createdLabel}</div>
      </td>
      <td className="p-3">
        <div>{patientName || "—"}</div>
        <div className="text-xs text-ink-soft">{patientPhone}</div>
      </td>
      <td className="p-3">
        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[order.status]}`}>
          {order.status.replace("_", " ")}
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
          <div className="flex flex-col items-end gap-1">
            <input
              value={courierRef}
              onChange={(e) => setCourierRef(e.target.value)}
              placeholder="Courier ref (optional)"
              className="w-40 rounded border border-[var(--border)] px-2 py-1 text-xs"
            />
            <div className="space-x-1">
              <button
                onClick={() => run(() => markMedicationShipped(order.id, courierRef))}
                disabled={pending}
                className="btn-primary text-xs py-1 px-3"
              >
                Mark shipped
              </button>
              <button
                onClick={() => run(() => cancelMedicationOrder(order.id))}
                disabled={pending}
                className="text-xs py-1 px-3 text-red-600 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {order.status === "shipped" && (
          <span className="text-xs text-ink-soft">
            {order.courierRef ? `Shipped · ${order.courierRef}` : "Shipped"}
          </span>
        )}
        {order.status === "cancelled" && (
          <span className="text-xs text-ink-soft">Cancelled</span>
        )}
      </td>
    </tr>
  );
}
