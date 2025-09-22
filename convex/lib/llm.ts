import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText, zodSchema, type LanguageModel } from "ai";
import type z from "zod";

type Provider = "Google" | "OpenAI";

type ModelDetails = {
  name: string;
  provider: Provider;
  cost_per_1M_input_tokens: number; // in USD
  cost_per_1M_output_tokens: number; // in USD
  reasoning?: boolean;
};

const MODEL_REGISTRY = {
  // Google Gemini models
  "gemini-2.5-flash-lite-preview-06-17": {
    name: "Gemini 2.5 Flash Lite Preview",
    provider: "Google",
    cost_per_1M_input_tokens: 5, // 0.05 USD
    cost_per_1M_output_tokens: 20, // 0.20 USD
  },
  // OpenAI models
  "gpt-4.1-mini-2025-04-14": {
    name: "GPT-4.1 Mini",
    provider: "OpenAI",
    cost_per_1M_input_tokens: 15, // 0.15 USD
    cost_per_1M_output_tokens: 60, // 0.60 USD
  },
  "gpt-4.1-nano-2025-04-14": {
    name: "GPT-4.1 Nano",
    provider: "OpenAI",
    cost_per_1M_input_tokens: 10, // 0.10 USD
    cost_per_1M_output_tokens: 40, // 0.40 USD
  },
} satisfies Record<string, ModelDetails>;

export type Model = keyof typeof MODEL_REGISTRY;

// ############################################################################

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ############################################################################

export async function generate_text(params: GenerateTextParams): Promise<string> {
  const model_client = _getModelClient(params.model);

  const start_time = Date.now();
  const { text, usage } = await generateText({
    model: model_client,
    system: params.system_prompt,
    prompt: params.user_prompt,
    temperature: params.temperature ?? 0.7,
  });
  const end_time = Date.now();

  const response_time = end_time - start_time;
  const modelDetails = _getModelDetails(params.model);
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const inputCost = (inputTokens / 1_000_000) * modelDetails.cost_per_1M_input_tokens;
  const outputCost = (outputTokens / 1_000_000) * modelDetails.cost_per_1M_output_tokens;
  const totalCost = inputCost + outputCost;

  if (params.log_key) {
    console.log(`[LLM] [${params.log_key}] response time: ${(response_time / 1000).toFixed(2)}s using ${params.model}`);
    console.log(`[LLM] [${params.log_key}] cost: $${(totalCost / 100).toFixed(4)} (input: $${(inputCost / 100).toFixed(4)}, output: $${(outputCost / 100).toFixed(4)})`);
  }

  return text;
}

export async function generate_structured_data<T extends z.ZodType>(params: GenerateStructuredDataParams<T>): Promise<z.infer<T>> {
  const model_client = _getModelClient(params.model);

  const start_time = Date.now();
  const { object, usage } = await generateObject({
    model: model_client,
    system: params.system_prompt,
    prompt: params.user_prompt,
    temperature: params.temperature ?? 0.7,
    schema: zodSchema(params.schema),
  });
  const end_time = Date.now();

  const response_time = end_time - start_time;
  const modelDetails = _getModelDetails(params.model);
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const inputCost = (inputTokens / 1_000_000) * modelDetails.cost_per_1M_input_tokens;
  const outputCost = (outputTokens / 1_000_000) * modelDetails.cost_per_1M_output_tokens;
  const totalCost = inputCost + outputCost;

  if (params.log_key) {
    console.log(`[LLM] [${params.log_key}] response time: ${(response_time / 1000).toFixed(2)}s using ${params.model}`);
    console.log(`[LLM] [${params.log_key}] cost: $${(totalCost / 100).toFixed(4)} (input: $${(inputCost / 100).toFixed(4)}, output: $${(outputCost / 100).toFixed(4)})`);
  }

  return object as z.infer<T>;
}

function _getModelDetails(model: Model): ModelDetails {
  const modelDetails = MODEL_REGISTRY[model];
  if (!modelDetails) {
    throw new Error(`Model not found: ${model}`);
  }
  return modelDetails;
}

function _getModelClient(model: Model): LanguageModel {
  const modelDetails = _getModelDetails(model);
  if (modelDetails.provider === "Google") {
    return google(model);
  } else if (modelDetails.provider === "OpenAI") {
    return openai(model);
  } else {
    throw new Error(`Unsupported provider: ${modelDetails.provider}`);
  }
}

export type GenerateTextParams = {
  model: Model;
  system_prompt: string;
  user_prompt: string;
  temperature?: number;
  log_key?: string;
}

export type GenerateStructuredDataParams<T extends z.ZodType> = {
  model: Model;
  system_prompt: string;
  user_prompt: string;
  schema: T;
  temperature?: number;
  log_key?: string;
}
