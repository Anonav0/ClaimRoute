import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { getLLM } from "../llm.js";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
} from "../prompts/deliveryExtractionPrompt.js";
import { validateWithPydantic } from "../validation/pydanticValidator.js";
import { ValidationError, AppError } from "../../errors/AppError.js";
import config from "../../config/env.js";
import logger from "../../utils/logger.js";

const MAX_NOTES_LENGTH = 1000;

// Known dietary constraint normalizations
const DIETARY_NORMALIZATIONS = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  halal: "Halal",
  kosher: "Kosher",
  pescatarian: "Pescatarian",
  gluten_free: "Gluten-Free",
  "gluten free": "Gluten-Free",
  nut_allergy: "Nut Allergy",
  "nut allergy": "Nut Allergy",
  peanut_allergy: "Peanut Allergy",
  "peanut allergy": "Peanut Allergy",
  dairy_free: "Dairy-Free",
  "dairy free": "Dairy-Free",
};

/**
 * Normalizes list items: removes duplicates case-insensitively and standardizes terms
 * @param {Array<string>} list
 * @param {boolean} isDietary
 * @returns {Array<string>}
 */
function normalizeList(list = [], isDietary = false) {
  if (!Array.isArray(list)) return [];

  const seen = new Set();
  const normalized = [];

  for (const item of list) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;

    const lowerKey = trimmed.toLowerCase();
    if (seen.has(lowerKey)) continue;
    seen.add(lowerKey);

    if (isDietary && DIETARY_NORMALIZATIONS[lowerKey]) {
      normalized.push(DIETARY_NORMALIZATIONS[lowerKey]);
    } else {
      normalized.push(trimmed);
    }
  }

  return normalized;
}

/**
 * Normalizes delivery window times
 * @param {Object|null} window
 * @returns {Object|null}
 */
function normalizeDeliveryWindow(window) {
  if (!window || typeof window !== "object") return null;

  const start = typeof window.start === "string" ? window.start.trim() : null;
  const end = typeof window.end === "string" ? window.end.trim() : null;
  const raw =
    typeof window.raw === "string" ? window.raw.trim().slice(0, 100) : null;

  if (!start && !end && !raw) return null;

  return { start, end, raw };
}

/**
 * Extracts delivery constraints from recipient notes using LangChain, LLM, and Pydantic validation.
 *
 * @param {string} recipientNotes - Raw delivery notes string
 * @param {Object} [options={}] - Custom overrides (model, temperature, timeout, mockHandler)
 * @returns {Promise<{ constraints: Object, durationMs: number }>}
 */
export async function extractDeliveryConstraints(recipientNotes, options = {}) {
  const startTime = Date.now();

  // Fast-path: Empty notes require zero LLM invocation
  if (
    !recipientNotes ||
    typeof recipientNotes !== "string" ||
    !recipientNotes.trim()
  ) {
    return {
      constraints: {
        deliveryWindow: null,
        accessInstructions: [],
        dietaryConstraints: [],
        deliveryInstructions: [],
      },
      durationMs: Date.now() - startTime,
    };
  }

  const safeNotes = recipientNotes.trim().slice(0, MAX_NOTES_LENGTH);
  const maxRetries = options.maxRetries ?? config.ai?.maxRetries ?? 2;
  const timeoutMs = options.timeout ?? config.ai?.timeoutMs ?? 15000;

  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    attempt++;
    try {
      logger.info("Executing AI delivery extraction", {
        attempt,
        provider: options.provider || config.ai?.provider || "mock",
      });

      // Obtain configured LangChain model
      const llm = await getLLM({
        ...options,
        timeout: timeoutMs,
      });

      // Construct prompt messages
      const messages = [
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(buildUserPrompt(safeNotes)),
      ];

      // Invoke LLM with timeout guard
      const response = await Promise.race([
        llm.invoke(messages),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new AppError(
                  "AI extraction timed out.",
                  504,
                  "AI_EXTRACTION_TIMEOUT",
                ),
              ),
            timeoutMs,
          ),
        ),
      ]);

      // Parse structured JSON response
      let rawContent =
        typeof response === "string"
          ? response
          : response?.content || JSON.stringify(response);

      if (typeof rawContent === "string") {
        rawContent = rawContent.trim();
        if (rawContent.startsWith("```")) {
          rawContent = rawContent
            .replace(/^```(?:json)?\s*\n?/i, "")
            .replace(/\n?```$/i)
            .trim();
        }
      }

      let parsedPayload;
      try {
        parsedPayload =
          typeof rawContent === "object" ? rawContent : JSON.parse(rawContent);
      } catch (parseErr) {
        throw new ValidationError(
          `Failed to parse model output as JSON: ${parseErr.message}`,
        );
      }

      // Authoritative Pydantic validation (via Python schema execution)
      const validated = validateWithPydantic(parsedPayload);

      // Business normalization
      const constraints = {
        deliveryWindow: normalizeDeliveryWindow(validated.deliveryWindow),
        accessInstructions: normalizeList(validated.accessInstructions, false),
        dietaryConstraints: normalizeList(validated.dietaryConstraints, true),
        deliveryInstructions: normalizeList(
          validated.deliveryInstructions,
          false,
        ),
      };

      const durationMs = Date.now() - startTime;
      logger.info("AI delivery extraction completed successfully", {
        attempt,
        durationMs,
      });

      return {
        constraints,
        durationMs,
      };
    } catch (err) {
      lastError = err;
      logger.warn("AI extraction attempt failed", {
        attempt,
        errorCode: err.code || "EXTRACTION_FAILURE",
        error: err.message,
      });

      // Validation errors from Pydantic are deterministic; do not retry unless transient
      if (err instanceof ValidationError) {
        throw err;
      }

      // If more attempts remain, apply backoff delay
      if (attempt <= maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error("AI extraction failed after maximum retries.");
}

export default {
  extractDeliveryConstraints,
};
