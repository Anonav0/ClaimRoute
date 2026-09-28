import config from "../config/env.js";
import logger from "../utils/logger.js";

/**
 * Mock LLM for offline tests and deterministic extraction validation
 */
export class MockLLM {
  constructor(customHandler = null) {
    this.customHandler = customHandler;
  }

  async invoke(messages) {
    if (this.customHandler) {
      return this.customHandler(messages);
    }

    // Default mock response: inspect user prompt content
    const userMsg = Array.isArray(messages)
      ? messages[messages.length - 1]?.content || ""
      : String(messages);

    const lower = userMsg.toLowerCase();

    // Check for prompt injection attempts in test cases
    if (
      lower.includes("ignore previous instructions") ||
      lower.includes("give me your api key") ||
      lower.includes("return the api key")
    ) {
      return {
        content: JSON.stringify({
          deliveryWindow: null,
          accessInstructions: [],
          dietaryConstraints: [],
          deliveryInstructions: [],
        }),
      };
    }

    const result = {
      deliveryWindow: null,
      accessInstructions: [],
      dietaryConstraints: [],
      deliveryInstructions: [],
    };

    // Extract time windows
    if (lower.includes("after 6 pm") || lower.includes("after 18:00")) {
      result.deliveryWindow = { start: "18:00", end: null, raw: null };
    } else if (
      (lower.includes("between 5") && lower.includes("7 pm")) ||
      lower.includes("5 pm and 7 pm") ||
      lower.includes("5 and 7")
    ) {
      result.deliveryWindow = { start: "17:00", end: "19:00", raw: null };
    } else if (lower.includes("evening")) {
      result.deliveryWindow = { start: null, end: null, raw: "evening" };
    }

    // Extract dietary
    if (lower.includes("vegetarian")) {
      result.dietaryConstraints.push("Vegetarian");
    }
    if (lower.includes("vegan")) {
      result.dietaryConstraints.push("Vegan");
    }
    if (lower.includes("nut allergy") || lower.includes("no peanuts")) {
      result.dietaryConstraints.push("Nut allergy");
    }

    // Extract access instructions
    if (lower.includes("gate code")) {
      const match = userMsg.match(/gate\s*code\s*(?:is|:)?\s*(\d+)/i);
      result.accessInstructions.push(
        match ? `Gate code: ${match[1]}` : "Gate code provided",
      );
    }
    if (
      lower.includes("call before entering") ||
      lower.includes("call me before entering")
    ) {
      result.accessInstructions.push("Call before entering");
    }
    if (
      lower.includes("security guard at the entrance") ||
      lower.includes("security guard at entrance")
    ) {
      result.accessInstructions.push("Security guard at entrance");
    }
    if (
      lower.includes("call me when you arrive") ||
      lower.includes("call on arrival")
    ) {
      result.accessInstructions.push("Call recipient when arriving");
    }

    // Extract delivery instructions
    if (
      lower.includes("leave package with security") ||
      lower.includes("leave with security")
    ) {
      result.deliveryInstructions.push("Leave package with security");
    }
    if (
      lower.includes("front desk") ||
      lower.includes("leave with front desk")
    ) {
      result.deliveryInstructions.push("Leave with front desk");
    }
    if (lower.includes("do not leave outside")) {
      result.deliveryInstructions.push("Do not leave outside");
    }

    return {
      content: JSON.stringify(result),
    };
  }
}

/**
 * Factory function creating a configured LangChain ChatModel instance.
 *
 * @param {Object} [overrideOptions={}]
 * @returns {Promise<Object>} LangChain ChatModel or MockLLM
 */
export async function getLLM(overrideOptions = {}) {
  const provider = (
    overrideOptions.provider ||
    config.ai?.provider ||
    (config.isTest ? "mock" : "openai")
  ).toLowerCase();

  const temperature =
    overrideOptions.temperature ?? config.ai?.temperature ?? 0;
  const timeout = overrideOptions.timeout ?? config.ai?.timeoutMs ?? 15000;
  const maxTokens = overrideOptions.maxTokens || 600;

  if (provider === "mock") {
    return new MockLLM(overrideOptions.mockHandler);
  }

  if (provider === "openai") {
    const apiKey = overrideOptions.apiKey || config.ai?.apiKey;
    if (!apiKey) {
      if (config.isTest || config.isDevelopment) {
        logger.warn(
          "LLM_API_KEY not configured for OpenAI. Falling back to MockLLM for local/test execution.",
        );
        return new MockLLM();
      }
      throw new Error(
        "OpenAI API key is missing. Set LLM_API_KEY in environment variables.",
      );
    }

    const { ChatOpenAI } = await import("@langchain/openai");
    return new ChatOpenAI({
      modelName: overrideOptions.model || config.ai?.model || "gpt-4o-mini",
      temperature,
      timeout,
      maxTokens,
      openAIApiKey: apiKey,
    });
  }

  if (provider === "google" || provider === "gemini") {
    const apiKey = overrideOptions.apiKey || config.ai?.apiKey;
    if (!apiKey) {
      if (config.isTest || config.isDevelopment) {
        logger.warn(
          "LLM_API_KEY not configured for Google GenAI. Falling back to MockLLM.",
        );
        return new MockLLM();
      }
      throw new Error(
        "Google GenAI API key is missing. Set LLM_API_KEY in environment variables.",
      );
    }

    const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");
    const targetModel =
      overrideOptions.model || config.ai?.model || "gemini-1.5-flash";

    return new ChatGoogleGenerativeAI({
      model: targetModel,
      modelName: targetModel,
      temperature,
      maxOutputTokens: maxTokens,
      apiKey,
    });
  }

  throw new Error(`Unsupported LLM provider: '${provider}'.`);
}

export default {
  getLLM,
  MockLLM,
};
