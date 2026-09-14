"use server";

import crypto from "crypto";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * Signed Cloudinary uploads for the admin ImageUpload widget. The cloud name
 * and preset ship in the public bundle, so an UNSIGNED preset lets anyone
 * upload to the clinic's account. With CLOUDINARY_API_KEY + _SECRET set, the
 * widget asks this action to sign each upload instead, and the preset can be
 * switched to "Signed" in Cloudinary so unsigned uploads are refused.
 */

async function guard() {
  const s = await requireAdmin();
  if (!s.authed) throw new Error("Unauthorized");
}

function signingConfigured() {
  return Boolean(process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

/** The API key is not a secret (Cloudinary sends it with every signed
 * request); null means signing isn't set up and the widget stays unsigned. */
export async function getUploadApiKeyAction() {
  await guard();
  return signingConfigured() ? process.env.CLOUDINARY_API_KEY : null;
}

/** Cloudinary's upload signature: the params sorted by key, joined as
 * k=v&k=v, with the API secret appended, SHA-1 hex. Only uploads through our
 * own preset get signed. */
export async function signUploadAction(paramsToSign) {
  await guard();
  if (!signingConfigured()) throw new Error("Cloudinary signing is not configured");
  if (paramsToSign?.upload_preset !== process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Unexpected upload preset");
  }
  const toSign = Object.keys(paramsToSign)
    .sort()
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join("&");
  return crypto
    .createHash("sha1")
    .update(toSign + process.env.CLOUDINARY_API_SECRET)
    .digest("hex");
}
