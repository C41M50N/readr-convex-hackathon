import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const ArticleMetadata = v.object({
  title: v.string(),
  summary: v.optional(v.string()),
  author: v.optional(v.string()),
  publish_date: v.optional(v.string()),
  description: v.optional(v.string()),
  favicon: v.optional(v.string()),
  cover_img: v.optional(v.string()),
})

export const ArticleContent = v.object({
  _id: v.id('contents'),
  type: v.literal('article'),
  url: v.string(),
  markdown: v.optional(v.string()),
  metadata: v.optional(ArticleMetadata),
  ingestionStatus: v.optional(v.union(
    v.literal("pending"),
    v.literal("extracting"),
    v.literal("converting"),
    v.literal("completed"),
    v.literal("failed")
  )),
})

export const VideoMetadata = v.object({
  title: v.string(),
  channel: v.string(),
  thumbnail: v.optional(v.string()),
  duration: v.optional(v.number()),
})

export const VideoContent = v.object({
  _id: v.id('contents'),
  type: v.literal('video'),
  url: v.string(),
  transcript: v.string(),
  metadata: VideoMetadata,
  ingestionStatus: v.optional(v.union(
    v.literal("pending"),
    v.literal("extracting"),
    v.literal("converting"),
    v.literal("completed"),
    v.literal("failed")
  )),
})

export default defineSchema({
  // Parsed content, shared between all users
  contents: defineTable(v.union(
    ArticleContent,
    VideoContent
  )).index('by_url', ['url']),

  // Generated content, specific to a user and a piece of content
  generated_contents: defineTable({
    sourceContentId: v.id('contents'),
    markdown: v.string(),
  }),

  // Mapping of users to a shared content and their generated content
  user_contents: defineTable({
    userId: v.id('users'),
    contentId: v.id('contents'),
    tags: v.array(v.string()),
    notes: v.string(),
    // generated_contents: v.array(v.id('generated_contents')),
  }),

  // Chat history for a user and a piece of content
  chats: defineTable({
    userId: v.id('users'),
    contentId: v.id('contents'),
    messages: v.array(v.object({ role: v.string(), content: v.string() })),
  }),
})
