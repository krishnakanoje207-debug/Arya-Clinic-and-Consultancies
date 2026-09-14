import { ImageResponse } from "next/og";
import { getSettings } from "@/lib/settings";

export const alt = "ARYA Homoeopathy — Dr. Seema Prajapati";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social share card for every page (Next resolves this as the default
 * og:image + twitter:image). Drawn from the admin SEO settings so the doctor
 * can change the wording without a redeploy; falls back to the built-in
 * defaults when the DB is unreachable at build time. */
/** Trim to a whole word so the card never ends mid-syllable. */
function clamp(text, max) {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export default async function OpengraphImage() {
  const s = await getSettings(["seo_title", "seo_description", "brand_tagline"]);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#faf6f0",
          position: "relative",
        }}
      >
        {/* Lotus-colour strip, mirroring the site footer. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "14px",
            display: "flex",
          }}
        >
          <div style={{ flex: 1, background: "#7c8a6b" }} />
          <div style={{ flex: 1, background: "#c4714f" }} />
          <div style={{ flex: 1, background: "#d9a441" }} />
          <div style={{ flex: 1, background: "#d98e9a" }} />
        </div>

        <div style={{ fontSize: 26, color: "#7c8a6b", letterSpacing: 4, display: "flex" }}>
          {(s.brand_tagline || "Healing starts here").toUpperCase()}
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 68,
            fontWeight: 700,
            color: "#3d3a35",
            lineHeight: 1.15,
            display: "flex",
          }}
        >
          {s.seo_title}
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 30,
            color: "#6b6660",
            lineHeight: 1.4,
            display: "flex",
          }}
        >
          {clamp(s.seo_description, 150)}
        </div>
      </div>
    ),
    size,
  );
}
