import Image from "next/image";

/**
 * next/image only optimizes hosts in next.config's remotePatterns
 * (res.cloudinary.com) — any other URL throws at render. Admins may paste
 * an image URL from anywhere, so for non-allowlisted hosts we fall back to
 * a plain <img> (unoptimized but never crashes the page). Cloudinary URLs
 * still get full optimization.
 */
const ALLOWED_HOSTS = ["res.cloudinary.com"];

function isOptimizable(src) {
  if (!src) return false;
  try {
    return ALLOWED_HOSTS.includes(new URL(src).hostname);
  } catch {
    // Relative path (/public asset) — next/image handles these fine.
    return src.startsWith("/");
  }
}

export default function SafeImage({ src, alt = "", width, height, className, priority, fill }) {
  if (!src) return null;
  if (isOptimizable(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        className={className}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading={priority ? "eager" : "lazy"} />;
}
