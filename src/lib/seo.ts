import type { Metadata } from "next";

/** Per-page metadata with canonical URL + Open Graph/Twitter cards. */
export function pageMeta(title: string, description: string, path: string, image?: string): Metadata {
  const images = image ? [image] : undefined;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, images },
    twitter: { title, description, images },
  };
}

/** JSON-LD props for a <script> tag, with < escaped per Next.js docs. */
export function jsonLdScript(data: object) {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: JSON.stringify(data).replace(/</g, "\\u003c") },
  } as const;
}
