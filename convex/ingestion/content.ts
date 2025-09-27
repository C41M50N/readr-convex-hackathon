import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import * as llm from "../lib/llm";

export const writeMarkdown = internalAction({
  args: { url: v.string(), html: v.string() },
  handler: async (ctx, args) => {
    console.log("Starting HTML to Markdown conversion for URL:", args.url);
    const markdown = await llm.generate_text({
      model: "gpt-4.1-mini-2025-04-14",
      system_prompt:
        "You are an expert at converting HTML content to clean, well-formatted Markdown. Remove any unnecessary elements such as ads, navigation bars, and footers. Focus on the main content of the article.",
      user_prompt: `Convert the following HTML content to Markdown:\n\n${args.html}`,
      log_key: "html-to-md",
    });

    await ctx.runMutation(internal.ingestion.content.storeMarkdown, {
      url: args.url,
      markdown,
    });
  },
});

export const storeMarkdown = internalMutation({
  args: { url: v.string(), markdown: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.runQuery(internal.ingestion.content.getContentByUrl, {
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
      url: args.url,
      markdown: args.markdown,
      ingestionStatus: "converting",
    });
    console.info("Inserted new content for URL:", args.url);
  },
});

export const getContentByUrl = internalQuery({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("contents")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();

    return existing;
  },
});
