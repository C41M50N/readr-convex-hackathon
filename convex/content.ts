import { v } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import {
	action,
	internalAction,
	internalMutation,
	internalQuery,
} from "./_generated/server";
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

		// Schedule Metadata extraction
		await ctx.scheduler.runAfter(0, internal.content.extractMetadata, {
			url: normalizedUrl,
			html: cleanHtml,
		});

		// Schedule HTML to Markdown conversion
		await ctx.scheduler.runAfter(0, internal.content.writeMarkdown, {
			url: normalizedUrl,
			html: cleanHtml,
		});
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
			await ctx.db.patch(existing._id, {
				metadata: {
					...existing.metadata,
					...args.metadata,
				},
			});
			console.log("Updated metadata for URL:", args.url);
			return;
		}

		await ctx.db.insert("contents", {
			url: args.url,
			metadata: {
				...args.metadata,
			},
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
			await ctx.db.patch(existing._id, {
				markdown: args.markdown,
			});
			console.log("Updated markdown for URL:", args.url);
			return;
		}

		await ctx.db.insert("contents", {
			url: args.url,
			markdown: args.markdown,
		});
		console.info("Inserted new content for URL:", args.url);
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
