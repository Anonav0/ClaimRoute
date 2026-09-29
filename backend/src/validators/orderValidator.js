import { ValidationError } from "../errors/AppError.js";

const PROTECTED_FIELDS = [
  "id",
  "senderId",
  "status",
  "createdAt",
  "updatedAt",
  "claimedAt",
  "recipientId",
  "recipient",
  "tokenHash",
  "claimToken",
  "processingStartedAt",
  "routingReadyAt",
  "fulfillmentReadyAt",
  "completedAt",
];

/**
 * Validates item structure and normalizes into { name, description }
 */
function normalizeAndValidateItem(itemInput, fallbackDescription = "") {
  if (!itemInput) {
    throw new ValidationError("Item is required.");
  }

  let name = "";
  let description =
    typeof fallbackDescription === "string" ? fallbackDescription.trim() : "";

  if (typeof itemInput === "string") {
    name = itemInput.trim();
  } else if (typeof itemInput === "object" && itemInput !== null) {
    if (
      typeof itemInput.name !== "string" ||
      itemInput.name.trim().length === 0
    ) {
      throw new ValidationError(
        "Item name is required and must be a valid string.",
      );
    }
    name = itemInput.name.trim();
    if (itemInput.description && typeof itemInput.description === "string") {
      description = itemInput.description.trim();
    }
  } else {
    throw new ValidationError(
      "Item must be a non-empty string or an object with a name property.",
    );
  }

  if (name.length > 100) {
    throw new ValidationError("Item name must not exceed 100 characters.");
  }

  if (description.length > 500) {
    throw new ValidationError("Description must not exceed 500 characters.");
  }

  return { name, description };
}

/**
 * Validates integer quantity between 1 and 100
 */
function validateQuantity(quantity) {
  if (quantity === undefined || quantity === null) {
    throw new ValidationError("Quantity is required.");
  }

  const num = Number(quantity);
  if (!Number.isInteger(num)) {
    throw new ValidationError("Quantity must be an integer.");
  }

  if (num <= 0) {
    throw new ValidationError("Quantity must be greater than zero.");
  }

  if (num > 100) {
    throw new ValidationError("Quantity must not exceed 100.");
  }

  return num;
}

/**
 * Express middleware to validate POST /api/orders request payload
 */
export const validateCreateOrder = (req, res, next) => {
  try {
    const body = req.body || {};

    // Reject attempt to tamper with protected server-controlled fields
    for (const field of PROTECTED_FIELDS) {
      if (body[field] !== undefined) {
        throw new ValidationError(
          `Field '${field}' cannot be specified by the client.`,
        );
      }
    }

    const item = normalizeAndValidateItem(body.item, body.description);
    const quantity = validateQuantity(body.quantity);

    let deliveryTimeframe = null;
    if (
      body.deliveryTimeframe !== undefined &&
      body.deliveryTimeframe !== null
    ) {
      if (typeof body.deliveryTimeframe !== "string") {
        throw new ValidationError("Delivery timeframe must be a string.");
      }
      deliveryTimeframe = body.deliveryTimeframe.trim().slice(0, 100);
    }

    let notes = null;
    if (body.notes !== undefined && body.notes !== null) {
      if (typeof body.notes !== "string") {
        throw new ValidationError("Notes must be a string.");
      }
      notes = body.notes.trim().slice(0, 500);
    }

    // Attach sanitized data for downstream controllers/services
    req.validatedOrder = {
      item,
      quantity,
      deliveryTimeframe,
      notes,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Express middleware to validate PATCH /api/orders/:orderId request payload
 */
export const validateUpdateOrder = (req, res, next) => {
  try {
    const body = req.body || {};

    // Reject attempts to update protected fields
    for (const field of PROTECTED_FIELDS) {
      if (body[field] !== undefined) {
        throw new ValidationError(
          `Protected field '${field}' cannot be updated.`,
        );
      }
    }

    const updates = {};
    let hasValidField = false;

    if (body.item !== undefined) {
      updates.item = normalizeAndValidateItem(body.item, body.description);
      hasValidField = true;
    } else if (body.description !== undefined) {
      if (typeof body.description !== "string") {
        throw new ValidationError("Description must be a string.");
      }
      updates.description = body.description.trim().slice(0, 500);
      hasValidField = true;
    }

    if (body.quantity !== undefined) {
      updates.quantity = validateQuantity(body.quantity);
      hasValidField = true;
    }

    if (body.deliveryTimeframe !== undefined) {
      if (
        typeof body.deliveryTimeframe !== "string" &&
        body.deliveryTimeframe !== null
      ) {
        throw new ValidationError(
          "Delivery timeframe must be a string or null.",
        );
      }
      updates.deliveryTimeframe = body.deliveryTimeframe
        ? body.deliveryTimeframe.trim().slice(0, 100)
        : null;
      hasValidField = true;
    }

    if (body.notes !== undefined) {
      if (typeof body.notes !== "string" && body.notes !== null) {
        throw new ValidationError("Notes must be a string or null.");
      }
      updates.notes = body.notes ? body.notes.trim().slice(0, 500) : null;
      hasValidField = true;
    }

    if (!hasValidField) {
      throw new ValidationError(
        "At least one editable field (item, quantity, deliveryTimeframe, notes) must be provided.",
      );
    }

    req.validatedUpdates = updates;
    next();
  } catch (error) {
    next(error);
  }
};

export default {
  validateCreateOrder,
  validateUpdateOrder,
};
