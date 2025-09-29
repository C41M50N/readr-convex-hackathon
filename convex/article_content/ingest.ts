import { type Infer, v } from "convex/values";
import { retrier } from "..";
import { internal } from "../_generated/api";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import * as llm from "../lib/llm";
import { type ArticleContent, ArticleMetadata } from "../schema";

export const ingestArticle = internalAction({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    console.info("Ingesting article from URL:", args.url);
    const cleanHtml = await getCleanHtml(args.url);

    await ctx.runMutation(internal.article_content.ingest.createArticleContentEntry, {
      url: args.url,
    });

    await retrier.run(
      ctx,
      internal.article_content.ingest_node.ingestArticleMetadata,
      { url: args.url, html: cleanHtml },
    );

    await retrier.run(
      ctx,
      internal.article_content.ingest.ingestArticleMarkdown,
      { url: args.url, html: cleanHtml },
    );
  },
});

// ############################# HELPER FUNCTIONS #############################

export const getArticleContentByUrl = internalQuery({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contents")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .filter((q) => q.eq(q.field("type"), "article"))
      .first() as Infer<typeof ArticleContent> | null;
  },
});

export const createArticleContentEntry = internalMutation({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("contents", {
      type: "article",
      url: args.url,
      ingestionStatus: "pending",
    });
    console.info("Created content entry for URL:", args.url);
  },
});

export const storeArticleMetadata = internalMutation({
  args: {
    url: v.string(),
    metadata: ArticleMetadata,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.runQuery(internal.article_content.ingest.getArticleContentByUrl, {
      url: args.url,
    });

    if (existing) {
      const newStatus = existing.markdown ? "completed" : "extracting";
      await ctx.db.patch(existing._id, {
        metadata: {
          ...existing.metadata,
          ...args.metadata,
        },
        ingestionStatus: newStatus,
      });
      console.info("Updated metadata for URL:", args.url);
      return;
    }

    await ctx.db.insert("contents", {
      type: "article",
      url: args.url,
      metadata: {
        ...args.metadata,
      },
      ingestionStatus: "extracting",
    });
    console.info("Inserted new content for URL:", args.url);
  },
});

export const ingestArticleMarkdown = internalAction({
  args: { url: v.string(), html: v.string() },
  handler: async (ctx, args) => {
    console.info("Converting HTML to Markdown for URL:", args.url);
    const markdown = await llm.generate_text({
      model: "gpt-4.1-mini-2025-04-14",
      system_prompt:
        "You are an expert at converting HTML content to clean, well-formatted Markdown. Remove any unnecessary elements such as ads, navigation bars, and footers. Focus on the main content of the article.",
      user_prompt: `Convert the following HTML content to Markdown:\n\n${args.html}`,
      log_key: "html-to-md",
    });

    await ctx.runMutation(internal.article_content.ingest.storeArticleMarkdown, {
      url: args.url,
      markdown,
    });
  },
});

export const storeArticleMarkdown = internalMutation({
  args: { url: v.string(), markdown: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.runQuery(internal.article_content.ingest.getArticleContentByUrl, {
      url: args.url,
    });

    if (existing) {
      const newStatus = existing.metadata ? "completed" : "converting";
      await ctx.db.patch(existing._id, {
        markdown: args.markdown,
        ingestionStatus: newStatus,
      });
      console.log("Updated markdown for URL:", args.url);
      return;
    }

    await ctx.db.insert("contents", {
      type: "article",
      url: args.url,
      markdown: args.markdown,
      ingestionStatus: "converting",
    });
    console.info("Inserted new content for URL:", args.url);
  },
});


// ################################## UTILS ##################################

async function getCleanHtml(url: string): Promise<string> {
  const response = await fetch(
    `${process.env.ORION_BASE_URL}/clean-html?url=${encodeURIComponent(url)}`,
  );
  return response.text();
}
