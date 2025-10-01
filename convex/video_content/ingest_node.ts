"use node";

import { v } from "convex/values";
import z from "zod";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { firecrawl } from "../lib/firecrawl";

export const ingestVideoMetadata = internalAction({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    console.info("Ingesting video metadata from URL:", args.url);
    // Fetch metadata from external service (e.g., YouTube API)
    const doc = await firecrawl.scrape(args.url, { formats: ["summary"] });
    const title = doc.metadata?.ogTitle!;
    const thumbnail = doc.metadata?.ogImage!;
    const favicon = doc.metadata?.favicon as string;
    const publish_date = doc.metadata?.uploadDate as string;

    const ExtractSchema = z.object({
      channel_name: z.string(),
      channel_url: z.string(),
      duration: z.number(),
    });

    const { data } = await firecrawl.extract({
      urls: [args.url],
      prompt:
        "Extract the channel name, channel url, and video duration (in seconds) from the video.",
      schema: ExtractSchema,
    });
    const { channel_name, channel_url, duration } = ExtractSchema.parse(data);

    console.info("Extracted video data:", {
      title,
      thumbnail,
      favicon,
      publish_date,
      channel_name,
      channel_url,
      duration,
    });

    await ctx.runMutation(internal.video_content.ingest.storeVideoMetadata, {
      url: args.url,
      metadata: {
        title,
        thumbnail,
        favicon,
        publish_date,
        channel_name,
        channel_url,
        duration,
      },
    });
  },
});
