"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Image field with a real uploader. When Cloudinary is configured
 * (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME + _UPLOAD_PRESET), it opens the Cloudinary
 * Upload Widget — device, Google Drive, Dropbox, camera and paste-URL sources —
 * and writes the returned secure URL into the field. When it isn't configured
 * (e.g. before the client sets up their free Cloudinary account) it degrades to
 * a plain URL text box so the form still works. A hidden-ish text input carries
 * the value so the surrounding <form> submits it exactly like before.
 */
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const WIDGET_SRC = "https://upload-widget.cloudinary.com/global/all.js";

export default function ImageUpload({
  name,
  label,
  defaultValue = "",
  hint,
  fullWidth,
}) {
  const [url, setUrl] = useState(defaultValue || "");
  const [ready, setReady] = useState(false);
  const widgetRef = useRef(null);
  const configured = Boolean(CLOUD && PRESET);

  // Load the widget script once (only when Cloudinary is configured).
  useEffect(() => {
    if (!configured) return;
    if (window.cloudinary) {
      // Script already present from a prior mount — sync that external fact
      // into React state (legitimate external→React sync, not a render loop).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReady(true);
      return;
    }
    let script = document.getElementById("cloudinary-upload-widget");
    if (!script) {
      script = document.createElement("script");
      script.id = "cloudinary-upload-widget";
      script.src = WIDGET_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
    const onLoad = () => setReady(true);
    script.addEventListener("load", onLoad);
    return () => script.removeEventListener("load", onLoad);
  }, [configured]);

  function openWidget() {
    if (!window.cloudinary) return;
    if (!widgetRef.current) {
      widgetRef.current = window.cloudinary.createUploadWidget(
        {
          cloudName: CLOUD,
          uploadPreset: PRESET,
          sources: ["local", "url", "camera", "google_drive", "dropbox"],
          multiple: false,
          maxFileSize: 5_000_000, // 5 MB
          clientAllowedFormats: ["png", "jpg", "jpeg", "webp", "gif"],
        },
        (error, result) => {
          if (!error && result?.event === "success") {
            setUrl(result.info.secure_url);
          }
        },
      );
    }
    widgetRef.current.open();
  }

  const inputCls =
    "w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm";

  return (
    <div className={`block ${fullWidth ? "sm:col-span-2" : ""}`}>
      <span className="block text-sm font-semibold text-ink mb-1">{label}</span>
      <div className="flex items-start gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-lg object-cover border border-[var(--border)]"
          />
        ) : (
          <div className="h-16 w-16 shrink-0 rounded-lg bg-cream-deep border border-[var(--border)] flex items-center justify-center text-[10px] text-ink-soft">
            No image
          </div>
        )}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            name={name}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className={inputCls}
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {configured ? (
              <button
                type="button"
                onClick={openWidget}
                disabled={!ready}
                className="btn-ghost text-xs py-1 px-3"
              >
                {ready ? "Upload / Drive…" : "Loading…"}
              </button>
            ) : (
              <span className="text-xs text-ink-soft">
                Paste a URL — device &amp; Drive upload activates once Cloudinary
                is set up.
              </span>
            )}
            {url ? (
              <button
                type="button"
                onClick={() => setUrl("")}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {hint ? (
        <span className="block text-xs text-ink-soft mt-1">{hint}</span>
      ) : null}
    </div>
  );
}
