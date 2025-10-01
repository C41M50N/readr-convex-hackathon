import { v, type Infer } from "convex/values";
import { retrier } from "..";
import { internal } from "../_generated/api";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { VideoMetadata, type VideoContent } from "../schema";
import * as llm from "../lib/llm";

export const ingestVideo = internalAction({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    console.info("Ingesting video from URL:", args.url);
    await ctx.runMutation(internal.video_content.ingest.createVideoContentEntry, {
      url: args.url,
    });

    await retrier.run(
      ctx,
      internal.video_content.ingest_node.ingestVideoMetadata,
      { url: args.url },
    );

    await retrier.run(
      ctx,
      internal.video_content.ingest.ingestVideoTranscript,
      { url: args.url },
    );
  },
});

// ############################# HELPER FUNCTIONS #############################

export const getVideoContentByUrl = internalQuery({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contents")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .filter((q) => q.eq(q.field("type"), "video"))
      .first() as Infer<typeof VideoContent> | null;
  },
});

export const createVideoContentEntry = internalMutation({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("contents", {
      type: "video",
      url: args.url,
      ingestionStatus: "pending",
    });
    console.info("Created content entry for URL:", args.url);
  },
});

export const storeVideoMetadata = internalMutation({
  args: {
    url: v.string(),
    metadata: VideoMetadata,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.runQuery(
      internal.video_content.ingest.getVideoContentByUrl,
      { url: args.url },
    );
    if (!existing) {
      throw new Error(`No video content found for URL: ${args.url}`);
    }

    await ctx.db.patch(existing._id, {
      metadata: args.metadata,
      ingestionStatus: existing.transcript ? "completed" : "extracting",
    });
    console.info("Stored video metadata for URL:", args.url);
  },
});

export const storeVideoTranscript = internalMutation({
  args: {
    url: v.string(),
    transcript: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.runQuery(
      internal.video_content.ingest.getVideoContentByUrl,
      { url: args.url },
    );
    if (!existing) {
      throw new Error(`No video content found for URL: ${args.url}`);
    }

    await ctx.db.patch(existing._id, {
      transcript: args.transcript,
      summary: args.summary,
      ingestionStatus: existing.metadata ? "completed" : "converting",
    });
    console.info("Stored video transcript for URL:", args.url);
  },
});

export const ingestVideoTranscript = internalAction({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    console.info("Ingesting video transcript for URL:", args.url);
    const rawTranscript = await getVideoTranscript(args.url);

    const finalTranscript = await llm.generate_text({
      model: "gemini-2.5-flash-lite-preview-06-17",
      system_prompt: "You are a helpful assistant that improves video transcripts by fixing grammar, punctuation, and formatting. Return the improved transcript in markdown format.",
      user_prompt: `Improve the readability of the following video transcript:\n\n${rawTranscript}`,
      log_key: "transcript-improve",
    });

    const summary = await llm.generate_text({
      model: "gemini-2.5-flash-lite-preview-06-17",
      system_prompt: "You are a helpful assistant that summarizes video transcripts into concise summaries.",
      user_prompt: `Summarize the following video transcript:\n\n${finalTranscript}`,
      log_key: "transcript-summarize",
    });

    await ctx.runMutation(internal.video_content.ingest.storeVideoTranscript, {
      url: args.url,
      transcript: finalTranscript,
      summary,
    });
  },
});

// ################################## UTILS ##################################

async function getVideoTranscript(url: string): Promise<string> {
  const response = await fetch(
    `${process.env.OCTANE_BASE_URL}/yt-transcript?url=${encodeURIComponent(url)}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch video transcript: ${response.statusText}`);
  }
  return response.text();
}
