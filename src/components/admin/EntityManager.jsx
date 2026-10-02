"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import ImageUpload from "@/components/admin/ImageUpload";

/**
 * Generic list + add/edit form + delete for a content table. Server actions
 * are passed in as props (upsertAction(prevState, formData) and
 * deleteAction(id)). `fields` drives the form; `columns` drives the table.
 *
 * A column is `{ key, label, format?, map? }`. `format` is a serializable
 * string (NOT a function — pages are Server Components and RSC cannot pass
 * functions to this client component). Supported formats:
 *   "bool"     → "Yes" / "No"
 *   "humanize" → replace underscores with spaces (e.g. booking_received)
 *   "rupees"   → "₹" + value
 *   "map"      → look the value up in the column's `map` object
 * Anything else renders the raw value as a string.
 */
function renderCell(col, item) {
  const raw = item[col.key];
  switch (col.format) {
    case "bool":
      return raw ? "Yes" : "No";
    case "humanize":
      return String(raw ?? "").replace(/_/g, " ");
    case "rupees":
      return `₹${raw ?? ""}`;
    case "map":
      return col.map?.[raw] ?? String(raw ?? "");
    default:
      return String(raw ?? "");
  }
}
export default function EntityManager({
  title,
  items,
  fields,
  columns,
  upsertAction,
  deleteAction,
  addLabel = "Add new",
}) {
  const [state, action, pending] = useActionState(upsertAction, null);
  const [editing, setEditing] = useState(null); // item being edited, or null
  const [showForm, setShowForm] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const formRef = useRef(null);

  // Close + reset the form once a save succeeds. Reacting to the server
  // action's returned state is a legitimate effect (external → React sync).
  useEffect(() => {
    if (state?.ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowForm(false);
      setEditing(null);
      formRef.current?.reset();
    }
  }, [state]);

  function startEdit(item) {
    setEditing(item);
    setShowForm(true);
  }
  function startAdd() {
    setEditing(null);
    setShowForm(true);
  }

  return (
    <div className="card-warm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-ink">{title}</h2>
        <button onClick={startAdd} className="btn-ghost text-xs py-1 px-3">
          {addLabel}
        </button>
      </div>

      {items.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-ink-soft">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="py-2 pr-3">
                    {c.label}
                  </th>
                ))}
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-[var(--border)]">
                  {columns.map((c) => (
                    <td key={c.key} className="py-2 pr-3 align-top">
                      {renderCell(c, item)}
                    </td>
                  ))}
                  <td className="py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => startEdit(item)}
                      className="text-xs text-sage-deep hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this item?"))
                          startDelete(async () => {
                            const res = await deleteAction(item.id);
                            if (res?.error) alert(res.error);
                          });
                      }}
                      disabled={isDeleting}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">Nothing yet.</p>
      )}

      {showForm && (
        <form
          ref={formRef}
          action={action}
          key={editing?.id ?? "new"}
          className="mt-6 border-t border-[var(--border)] pt-4 grid gap-3 sm:grid-cols-2"
        >
          {editing?.id ? (
            <input type="hidden" name="id" value={editing.id} />
          ) : null}
          {fields.map((f) => (
            <FormField
              key={f.name}
              field={f}
              value={editing?.[f.name]}
              isNew={!editing?.id}
            />
          ))}
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="btn-ghost"
            >
              Cancel
            </button>
            {state?.error && (
              <span className="text-sm text-terracotta-deep">{state.error}</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function FormField({ field, value, isNew }) {
  const { name, label, type = "text", options, hint, fullWidth } = field;
  const cls = fullWidth ? "sm:col-span-2" : "";
  const inputCls =
    "w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm";

  if (type === "image") {
    return (
      <ImageUpload
        name={name}
        label={label}
        defaultValue={value}
        hint={hint}
        fullWidth={fullWidth}
      />
    );
  }

  if (type === "checkbox") {
    // New items honor field.defaultChecked (e.g. active/published default on);
    // when editing, reflect the row's stored value.
    const checked = isNew ? Boolean(field.defaultChecked) : Boolean(value);
    return (
      <label className={`flex items-center gap-2 ${cls}`}>
        <input
          type="checkbox"
          name={name}
          defaultChecked={checked}
          className="h-4 w-4 accent-[var(--sage)]"
        />
        <span className="text-sm">{label}</span>
      </label>
    );
  }

  return (
    <label className={`block ${cls}`}>
      <span className="block text-sm font-semibold text-ink mb-1">{label}</span>
      {type === "textarea" ? (
        <textarea name={name} defaultValue={value ?? ""} rows={3} className={inputCls} />
      ) : type === "select" ? (
        <select name={name} defaultValue={value ?? options?.[0]?.value} className={inputCls}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          defaultValue={value ?? ""}
          className={inputCls}
        />
      )}
      {hint && <span className="block text-xs text-ink-soft mt-1">{hint}</span>}
    </label>
  );
}
