import crypto from "crypto";

/**
 * Optional Google Drive copy of archive exports, using a service-account
 * credential (the one "necessary free API key" exception the brief
 * allows). Zero npm deps: we mint the OAuth JWT ourselves (RS256 via node
 * crypto) and call Drive's multipart upload REST endpoint.
 *
 * Env: GOOGLE_SERVICE_ACCOUNT_JSON = full service-account JSON (single
 * line), DRIVE_ARCHIVE_FOLDER_ID = target folder shared with the
 * service-account's client_email.
 */

export function driveConfigured() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.DRIVE_ARCHIVE_FOLDER_ID,
  );
}

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken() {
  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/drive.file",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer
    .sign(sa.private_key)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const jwt = `${header}.${claims}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`Drive token: ${res.status} ${await res.text()}`);
  const { access_token } = await res.json();
  return access_token;
}

/** Multipart upload of one text file into the archive folder. */
export async function uploadToDrive(filename, content, mimeType) {
  const token = await getAccessToken();
  const boundary = "drseema-archive-boundary";
  const metadata = {
    name: filename,
    parents: [process.env.DRIVE_ARCHIVE_FOLDER_ID],
  };
  const body =
    `--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\ncontent-type: ${mimeType}\r\n\r\n` +
    content +
    `\r\n--${boundary}--`;

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!res.ok) throw new Error(`Drive upload: ${res.status} ${await res.text()}`);
  return res.json();
}
