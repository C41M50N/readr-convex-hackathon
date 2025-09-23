import { ActionRetrier } from "@convex-dev/action-retrier";
import { components } from "./_generated/api";

export const retrier = new ActionRetrier(components.actionRetrier, {
  initialBackoffMs: 100,  // Very short initial delay
  base: 2.5,              // Slower exponential growth for longer delays
  maxFailures: 5,         // Retry up to 5 times
});