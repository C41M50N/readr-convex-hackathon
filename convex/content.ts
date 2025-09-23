import { v } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import {
	action,
	internalAction,
	internalMutation,
	internalQuery,
} from "./_generated/server";
import { runIdValidator, runResultValidator } from "@convex-dev/action-retrier";
import { retrier } from "./index";
import { firecrawl } from "./lib/firecrawl";
import * as llm from "./lib/llm";
import { ArticleMetadata } from "./schema";

export const ingest = action({
	args: { url: v.string() },
	handler: async (ctx, args) => {
		const normalizedUrl = await normalizeURL(args.url);
		console.info("Normalized URL:", normalizedUrl);

		// Check if content already exists
		const existing = await ctx.runQuery(internal.content.getContentByUrl, {
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

		const cleanHtml = await getCleanHTML(normalizedUrl);

		// Set initial status
		await ctx.runMutation(internal.content.createContentEntry, {
			url: normalizedUrl,
		});

		// Start metadata extraction with retries
		await retrier.run(
			ctx,
			internal.content.extractMetadata,
			{ url: normalizedUrl, html: cleanHtml },
			{
				onComplete: internal.content.handleMetadataComplete,
			}
		);

		// Start HTML to Markdown conversion with retries
		await retrier.run(
			ctx,
			internal.content.writeMarkdown,
			{ url: normalizedUrl, html: cleanHtml },
			{
				onComplete: internal.content.handleMarkdownComplete,
			}
		);
	},
});

export const extractMetadata = internalAction({
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

		console.log("Extracted metadata:", {
			title,
			description,
			author,
			publish_date,
			cover_img,
			favicon,
			summary,
		});

		await ctx.runMutation(internal.content.storeMetadata, {
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

		await ctx.runMutation(internal.content.storeMarkdown, {
			url: args.url,
			markdown,
		});
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

export const storeMetadata = internalMutation({
	args: {
		url: v.string(),
		metadata: ArticleMetadata,
	},
	handler: async (ctx, args) => {
		const existing = await ctx.runQuery(internal.content.getContentByUrl, {
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
			console.log("Updated metadata for URL:", args.url);
			return;
		}

		await ctx.db.insert("contents", {
			url: args.url,
			metadata: {
				...args.metadata,
			},
			ingestionStatus: "extracting",
		});
		console.info("Inserted new content for URL:", args.url);
	},
});

export const storeMarkdown = internalMutation({
	args: { url: v.string(), markdown: v.string() },
	handler: async (ctx, args) => {
		const existing = await ctx.runQuery(internal.content.getContentByUrl, {
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

export const createContentEntry = internalMutation({
	args: { url: v.string() },
	handler: async (ctx, args) => {
		await ctx.db.insert("contents", {
			url: args.url,
			ingestionStatus: "pending",
		});
		console.info("Created content entry for URL:", args.url);
	},
});

export const handleMetadataComplete = internalMutation({
	args: { runId: runIdValidator, result: runResultValidator },
	handler: async (ctx, args) => {
		// Extract URL from the run result - this is a bit tricky since we don't have direct access
		// We'll need to find the content entry that doesn't have metadata yet
		// For now, just log the completion
		if (args.result.type === "success") {
			console.log("Metadata extraction completed successfully");
			// The metadata is already stored by the extractMetadata action
		} else if (args.result.type === "failed") {
			console.error("Metadata extraction failed after retries:", args.result.error);
			// Update status to failed
			const content = await ctx.db.query("contents").first();
			if (content) {
				await ctx.db.patch(content._id, { ingestionStatus: "failed" });
			}
		} else if (args.result.type === "canceled") {
			console.log("Metadata extraction was canceled");
		}
	},
});

export const handleMarkdownComplete = internalMutation({
	args: { runId: runIdValidator, result: runResultValidator },
	handler: async (ctx, args) => {
		if (args.result.type === "success") {
			console.log("Markdown conversion completed successfully");
			// The markdown is already stored by the writeMarkdown action
		} else if (args.result.type === "failed") {
			console.error("Markdown conversion failed after retries:", args.result.error);
			// Update status to failed
			const content = await ctx.db.query("contents").first();
			if (content) {
				await ctx.db.patch(content._id, { ingestionStatus: "failed" });
			}
		} else if (args.result.type === "canceled") {
			console.log("Markdown conversion was canceled");
		}
	},
});

// ########################## UTILS ##########################

/**
 * Normalize a URL by removing query parameters and fragments, removing trailing slashes,
 * and following redirects to get the final URL.
 */
async function normalizeURL(url: string): Promise<string> {
	try {
		// Follow redirects to get the final URL
		const response = await fetch(url, {
			method: "HEAD",
			redirect: "follow",
		});

		// Use the final redirected URL
		const finalUrl = response.url;

		// Parse and normalize the URL
		const { protocol, host, pathname } = new URL(finalUrl);
		return `${protocol}//${host}${pathname.replace(/\/+$/, "")}`;
	} catch {
		// If fetch fails, normalize the original URL without following redirects
		const { protocol, host, pathname } = new URL(url);
		return `${protocol}//${host}${pathname.replace(/\/+$/, "")}`;
	}
}

async function getCleanHTML(url: string): Promise<string> {
	const response = await fetch(
		`${process.env.ORION_BASE_URL}/clean-html?url=${encodeURIComponent(url)}`,
	);
	return response.text();
}
