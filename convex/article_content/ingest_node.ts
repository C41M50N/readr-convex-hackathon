"use node";

import { v } from "convex/values";
import { z } from "zod";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { firecrawl } from "../lib/firecrawl";
import * as llm from "../lib/llm";

export const ingestArticleMetadata = internalAction({
  args: {
    url: v.string(),
    html: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("Starting metadata extraction for URL:", args.url);
    const { title, description, author, publish_date } =
      await llm.generate_structured_data({
        model: "gpt-4.1-nano-2025-04-14",
        system_prompt:
          "You are an expert at extracting metadata from articles. When extracting dates, convert them to YYYY-MM-DD format.",
        user_prompt: `Extract metadata from the following article: ${args.html}`,
        schema: z.object({
          title: z.string(),
          description: z.string().optional(),
          author: z.string().optional(),
          publish_date: z.string().optional(),
        }),
        log_key: "extract-meta",
      });

    const doc = await firecrawl.scrape(args.url, { formats: ["summary"] });
    const cover_img = doc.metadata?.ogImage;
    const favicon = doc.metadata?.favicon as string | undefined;
    const summary = doc.summary;

    await ctx.runMutation(internal.article_content.ingest.storeArticleMetadata, {
      url: args.url,
      metadata: {
        title,
        summary,
        author,
        publish_date,
        description,
        favicon,
        cover_img,
      },
    });
  },
});
