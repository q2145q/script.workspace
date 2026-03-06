import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/terms"],
        disallow: ["/api/", "/dashboard", "/project/", "/profile", "/sign-in", "/sign-up"],
      },
    ],
    sitemap: "https://script.yomimovie.art/sitemap.xml",
  };
}
