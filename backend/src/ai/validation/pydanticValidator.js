import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ValidationError } from "../../errors/AppError.js";
import config from "../../config/env.js";
import logger from "../../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Python Pydantic schema script
const PYDANTIC_SCRIPT_PATH = path.resolve(
  __dirname,
  "../schemas/delivery_constraints.py",
);

// Resolve preferred Python binary
function resolvePythonBinary() {
  if (config.ai?.pythonPath && fs.existsSync(config.ai.pythonPath)) {
    return config.ai.pythonPath;
  }

  // Check virtual environment in backend/.venv
  const venvPython = path.resolve(__dirname, "../../../../.venv/bin/python3");
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }

  const venvPythonAlt = path.resolve(__dirname, "../../../.venv/bin/python3");
  if (fs.existsSync(venvPythonAlt)) {
    return venvPythonAlt;
  }

  return "python3";
}

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Pure JavaScript schema validator matching Pydantic DeliveryConstraints schema rules.
 * Acts as an in-process fallback or verification baseline.
 */
export function validateDeliveryConstraintsInJS(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new ValidationError("Delivery constraints must be an object.");
  }

  const allowedKeys = new Set([
    "deliveryWindow",
    "accessInstructions",
    "dietaryConstraints",
    "deliveryInstructions",
  ]);

  for (const key of Object.keys(data)) {
    if (!allowedKeys.has(key)) {
      throw new ValidationError(
        `Extra field not permitted in constraints: '${key}'.`,
      );
    }
  }

  const result = {
    deliveryWindow: null,
    accessInstructions: [],
    dietaryConstraints: [],
    deliveryInstructions: [],
  };

  // Validate deliveryWindow
  if (data.deliveryWindow !== undefined && data.deliveryWindow !== null) {
    if (
      typeof data.deliveryWindow !== "object" ||
      Array.isArray(data.deliveryWindow)
    ) {
      throw new ValidationError("deliveryWindow must be an object or null.");
    }

    const windowAllowed = new Set(["start", "end", "raw"]);
    for (const k of Object.keys(data.deliveryWindow)) {
      if (!windowAllowed.has(k)) {
        throw new ValidationError(`Extra field in deliveryWindow: '${k}'.`);
      }
    }

    let { start = null, end = null, raw = null } = data.deliveryWindow;

    if (start !== null) {
      if (typeof start !== "string" || !TIME_REGEX.test(start.trim())) {
        throw new ValidationError(
          `Invalid start time format '${start}'. Expected 24-hour HH:MM (e.g. 18:00).`,
        );
      }
      start = start.trim();
    }

    if (end !== null) {
      if (typeof end !== "string" || !TIME_REGEX.test(end.trim())) {
        throw new ValidationError(
          `Invalid end time format '${end}'. Expected 24-hour HH:MM (e.g. 21:00).`,
        );
      }
      end = end.trim();
    }

    if (start && end) {
      const [startH, startM] = start.split(":").map(Number);
      const [endH, endM] = end.split(":").map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;

      if (startMins > endMins) {
        throw new ValidationError(
          `Delivery window start time (${start}) cannot be after end time (${end}).`,
        );
      }
    }

    if (raw !== null) {
      raw = typeof raw === "string" ? raw.trim().slice(0, 100) : null;
    }

    if (start || end || raw) {
      result.deliveryWindow = { start, end, raw };
    }
  }

  // Validate list fields
  const listFields = [
    "accessInstructions",
    "dietaryConstraints",
    "deliveryInstructions",
  ];
  for (const field of listFields) {
    const rawList = data[field];
    if (rawList !== undefined && rawList !== null) {
      if (!Array.isArray(rawList)) {
        throw new ValidationError(
          `Field '${field}' must be an array of strings.`,
        );
      }
      if (rawList.length > 25) {
        throw new ValidationError(
          `Too many items in '${field}' (max 25 allowed).`,
        );
      }

      const cleaned = [];
      for (const item of rawList) {
        if (typeof item !== "string") continue;
        const trimmed = item.trim();
        if (trimmed.length > 0 && trimmed.length <= 300) {
          cleaned.push(trimmed);
        }
      }
      result[field] = cleaned;
    }
  }

  return result;
}

/**
 * Validates extraction payload against the authoritative Pydantic schema using Python IPC,
 * with pure JS validator fallback if Python execution fails or is unavailable.
 *
 * @param {Object} rawOutput - Unvalidated parsed LLM output
 * @returns {Object} Strictly validated and normalized DeliveryConstraints object
 * @throws {ValidationError} if payload fails schema validation
 */
export function validateWithPydantic(rawOutput) {
  if (!rawOutput || typeof rawOutput !== "object") {
    throw new ValidationError("Extraction output must be a valid JSON object.");
  }

  const jsonStr = JSON.stringify(rawOutput);
  const pythonBin = resolvePythonBinary();

  // Attempt Pydantic validation via Python subprocess
  if (fs.existsSync(PYDANTIC_SCRIPT_PATH)) {
    try {
      const proc = spawnSync(pythonBin, [PYDANTIC_SCRIPT_PATH], {
        input: jsonStr,
        encoding: "utf-8",
        timeout: 5000,
      });

      if (proc.status === 0 && proc.stdout) {
        const validated = JSON.parse(proc.stdout.trim());
        return validated;
      }

      // If python returned an error, check if it's a Pydantic validation failure
      if (proc.stderr) {
        let errData;
        try {
          errData = JSON.parse(proc.stderr.trim());
        } catch {
          errData = null;
        }

        if (errData && errData.error === "PYDANTIC_VALIDATION_ERROR") {
          throw new ValidationError(
            `Pydantic schema validation error: ${errData.message}`,
          );
        }
      }
    } catch (err) {
      // Re-throw our explicit ValidationError
      if (err instanceof ValidationError) {
        throw err;
      }
      logger.warn(
        "Pydantic Python execution failed; falling back to in-process JS schema validator",
        { error: err.message },
      );
    }
  }

  // Fallback to in-process JavaScript schema validator
  return validateDeliveryConstraintsInJS(rawOutput);
}

export default {
  validateWithPydantic,
  validateDeliveryConstraintsInJS,
};
