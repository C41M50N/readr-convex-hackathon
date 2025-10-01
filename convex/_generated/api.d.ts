/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as article_content_ingest from "../article_content/ingest.js";
import type * as article_content_ingest_node from "../article_content/ingest_node.js";
import type * as content from "../content.js";
import type * as index from "../index.js";
import type * as ingestion from "../ingestion.js";
import type * as lib_firecrawl from "../lib/firecrawl.js";
import type * as lib_llm from "../lib/llm.js";
import type * as video_content_ingest from "../video_content/ingest.js";
import type * as video_content_ingest_node from "../video_content/ingest_node.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "article_content/ingest": typeof article_content_ingest;
  "article_content/ingest_node": typeof article_content_ingest_node;
  content: typeof content;
  index: typeof index;
  ingestion: typeof ingestion;
  "lib/firecrawl": typeof lib_firecrawl;
  "lib/llm": typeof lib_llm;
  "video_content/ingest": typeof video_content_ingest;
  "video_content/ingest_node": typeof video_content_ingest_node;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  actionRetrier: {
    public: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { runId: string },
        boolean
      >;
      cleanup: FunctionReference<
        "mutation",
        "internal",
        { runId: string },
        any
      >;
      start: FunctionReference<
        "mutation",
        "internal",
        {
          functionArgs: any;
          functionHandle: string;
          options: {
            base: number;
            initialBackoffMs: number;
            logLevel: "DEBUG" | "INFO" | "WARN" | "ERROR";
            maxFailures: number;
            onComplete?: string;
            runAfter?: number;
            runAt?: number;
          };
        },
        string
      >;
      status: FunctionReference<
        "query",
        "internal",
        { runId: string },
        | { type: "inProgress" }
        | {
            result:
              | { returnValue: any; type: "success" }
              | { error: string; type: "failed" }
              | { type: "canceled" };
            type: "completed";
          }
      >;
    };
  };
};
