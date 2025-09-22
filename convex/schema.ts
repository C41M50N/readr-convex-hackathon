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

export default defineSchema({
  // Parsed content, shared between all users
  contents: defineTable({
    url: v.string(),
    markdown: v.optional(v.string()),
    metadata: v.optional(ArticleMetadata),
  }).index('by_url', ['url']),

  // Generated content, specific to a user and a piece of content
  generated_contents: defineTable({
    sourceContentId: v.id('contents'),
    markdown: v.string(),
  }),

  // Mapping of users to a shared content and their generated content
  user_contents: defineTable({
    userId: v.id('users'),
    contentId: v.id('contents'),
    generated_contents: v.array(v.id('generated_contents')),
  }),

  // Chat history for a user and a piece of content
  chats: defineTable({
    userId: v.id('users'),
    contentId: v.id('contents'),
    messages: v.array(v.object({ role: v.string(), content: v.string() })),
  }),
})
