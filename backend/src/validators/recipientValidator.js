import { ValidationError } from "../errors/AppError.js";

// Protected field names that clients must never inject into recipient submissions
const PROTECTED_FIELDS = [
  "orderId",
  "senderId",
  "claimTokenId",
  "tokenHash",
  "status",
  "orderStatus",
  "id",
  "createdAt",
  "updatedAt",
  "claimedAt",
];

const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{5,20}$/;

/**
 * Validates recipient completion request body (POST /api/claims/:token/complete)
 */
export function validateRecipientSubmission(req, res, next) {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return next(
      new ValidationError("Request body must be a valid JSON object."),
    );
  }

  // Reject forbidden/tampered protected fields
  for (const field of PROTECTED_FIELDS) {
    if (field in body) {
      return next(
        new ValidationError(
          `Field '${field}' cannot be specified by the client.`,
        ),
      );
    }
  }

  const { fullName, phone, address, notes } = body;

  // 1. Full Name Validation
  if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
    return next(new ValidationError("Full name is required."));
  }
  const cleanFullName = fullName.trim();
  if (cleanFullName.length < 2) {
    return next(
      new ValidationError("Full name must be at least 2 characters."),
    );
  }
  if (cleanFullName.length > 100) {
    return next(
      new ValidationError("Full name must not exceed 100 characters."),
    );
  }

  // 2. Phone Number Validation
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    return next(new ValidationError("Phone number is required."));
  }
  const cleanPhone = phone.trim();
  if (!PHONE_REGEX.test(cleanPhone)) {
    return next(new ValidationError("Please provide a valid phone number."));
  }
  if (cleanPhone.length < 7 || cleanPhone.length > 25) {
    return next(
      new ValidationError(
        "Phone number length must be between 7 and 25 characters.",
      ),
    );
  }

  // 3. Structured Address Validation
  if (!address || typeof address !== "object" || Array.isArray(address)) {
    return next(
      new ValidationError("Structured delivery address is required."),
    );
  }

  // Address Line 1
  if (
    !address.line1 ||
    typeof address.line1 !== "string" ||
    !address.line1.trim()
  ) {
    return next(new ValidationError("Address line 1 is required."));
  }
  const cleanLine1 = address.line1.trim();
  if (cleanLine1.length < 3 || cleanLine1.length > 150) {
    return next(
      new ValidationError(
        "Address line 1 must be between 3 and 150 characters.",
      ),
    );
  }

  // Address Line 2 (Optional)
  let cleanLine2 = "";
  if (address.line2 !== undefined && address.line2 !== null) {
    if (typeof address.line2 !== "string") {
      return next(new ValidationError("Address line 2 must be a string."));
    }
    cleanLine2 = address.line2.trim();
    if (cleanLine2.length > 150) {
      return next(
        new ValidationError("Address line 2 must not exceed 150 characters."),
      );
    }
  }

  // City
  if (
    !address.city ||
    typeof address.city !== "string" ||
    !address.city.trim()
  ) {
    return next(new ValidationError("City is required."));
  }
  const cleanCity = address.city.trim();
  if (cleanCity.length < 2 || cleanCity.length > 100) {
    return next(
      new ValidationError("City must be between 2 and 100 characters."),
    );
  }

  // State / Province
  if (
    !address.state ||
    typeof address.state !== "string" ||
    !address.state.trim()
  ) {
    return next(new ValidationError("State or province is required."));
  }
  const cleanState = address.state.trim();
  if (cleanState.length < 2 || cleanState.length > 100) {
    return next(
      new ValidationError(
        "State or province must be between 2 and 100 characters.",
      ),
    );
  }

  // Postal Code
  if (
    !address.postalCode ||
    typeof address.postalCode !== "string" ||
    !address.postalCode.trim()
  ) {
    return next(new ValidationError("Postal code is required."));
  }
  const cleanPostalCode = address.postalCode.trim();
  if (cleanPostalCode.length < 2 || cleanPostalCode.length > 20) {
    return next(
      new ValidationError("Postal code must be between 2 and 20 characters."),
    );
  }

  // Country
  if (
    !address.country ||
    typeof address.country !== "string" ||
    !address.country.trim()
  ) {
    return next(new ValidationError("Country is required."));
  }
  const cleanCountry = address.country.trim();
  if (cleanCountry.length < 2 || cleanCountry.length > 100) {
    return next(
      new ValidationError("Country must be between 2 and 100 characters."),
    );
  }

  // 4. Delivery Notes (Optional)
  let cleanNotes = "";
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== "string") {
      return next(new ValidationError("Delivery notes must be a text string."));
    }
    cleanNotes = notes.trim();
    if (cleanNotes.length > 500) {
      return next(
        new ValidationError("Delivery notes must not exceed 500 characters."),
      );
    }
  }

  // Attach sanitized recipient payload to request
  req.validatedRecipient = {
    fullName: cleanFullName,
    phone: cleanPhone,
    address: {
      line1: cleanLine1,
      line2: cleanLine2,
      city: cleanCity,
      state: cleanState,
      postalCode: cleanPostalCode,
      country: cleanCountry,
    },
    notes: cleanNotes || null,
  };

  next();
}

export default {
  validateRecipientSubmission,
};
