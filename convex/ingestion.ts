import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  action,
  internalQuery,
} from "./_generated/server";

export const ingest = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const normalizedUrl = await normalizeURL(args.url);
    if (!normalizedUrl) {
      console.warn("Invalid or non-HTML URL:", args.url);
      return;
    }
    console.info("Normalized URL:", normalizedUrl);

    // Check if content already exists
    const existing = await ctx.runQuery(internal.ingestion.getContentByUrl, {
      url: normalizedUrl,
    });

    if (existing) {
      console.info("Content already exists for URL:", normalizedUrl);
      return;
    }

    // (1) Categorize the content (article vs. video)
    // (1.1) If video, extract transcript and metadata (using Firecrawl)
    // (1.2) If article, ...
    // (1.2.1) Fetch clean HTML
    // (1.2.2) Use Firecrawl to extract easy metadata (favicon, meta_image)
    // 					+ Use LLM to extract hard metadata (title, author, publish date, description)
    // (1.2.3) Use LLM to convert HTML to markdown

    await ctx.runAction(internal.article_content.ingest.ingestArticle, {
      url: normalizedUrl,
    });

  },
});

// ############################# HELPER FUNCTIONS #############################

export const getContentByUrl = internalQuery({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contents")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();
  },
});

// ################################## UTILS ##################################

async function normalizeURL(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!response.ok || !response.headers.get("Content-Type")?.includes("text/html")) {
      return undefined;
    }
    // Use the final redirected URL
    const finalUrl = response.url;
    // Parse and normalize the URL
    const { protocol, host, pathname } = new URL(finalUrl);
    return `${protocol}//${host}${pathname.replace(/\/+$/, "")}`;
  } catch {
    return undefined;
  }
}
