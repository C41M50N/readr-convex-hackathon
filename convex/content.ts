import { v } from "convex/values";
import { query } from "./_generated/server";

export const getInboxContent = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("contents")
      .order("desc")
      .take(50);
  },
});

export const getArchivedContent = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("contents")
      // .filter((q) => q.eq(q.field("archived"), true))
      .order("desc")
      .take(50);
  },
});

// export const searchAllContent = query({
//   args: { query: v.string() },
//   handler: async (ctx, args) => {
//     const results = await ctx.db
//       .query("contents")
//       .filter((q) =>
//         q.or([
//           q.contains(q.field("title"), args.query),
//           q.contains(q.field("author"), args.query),
//           q.contains(q.field("description"), args.query),
//           q.contains(q.field("text"), args.query),
//         ])
//       )
//       .orderBy("created_at", "desc")
//       .limit(50)
//       .collect();
//     return results;
//   },
// });

export const getContentById = query({
  args: { id: v.id("contents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
