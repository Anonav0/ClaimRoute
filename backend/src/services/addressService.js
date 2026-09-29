/**
 * Address Service
 *
 * Isolates recipient address validation and sanitization for routing eligibility.
 * Does not invoke external geocoders or GPS engines in Phase 8, but acts as the
 * abstraction boundary where coordinate resolution can be introduced in future phases.
 */

export class AddressService {
  /**
   * Validate that an address object contains all required fields for routing dispatch.
   * Required fields: line1, city, state, postalCode, country.
   *
   * @param {Object} address
   * @returns {{ valid: boolean, errors: string[], normalizedAddress: Object|null }}
   */
  validateAddressForRouting(address) {
    const errors = [];

    if (!address || typeof address !== "object" || Array.isArray(address)) {
      return {
        valid: false,
        errors: ["Address object is required."],
        normalizedAddress: null,
      };
    }

    const requiredFields = ["line1", "city", "state", "postalCode", "country"];
    for (const field of requiredFields) {
      const val = address[field];
      if (typeof val !== "string" || !val.trim()) {
        errors.push(
          `Address field '${field}' is required and cannot be empty.`,
        );
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        errors,
        normalizedAddress: null,
      };
    }

    const normalizedAddress = {
      line1: address.line1.trim(),
      line2: address.line2 ? address.line2.trim() : null,
      city: address.city.trim(),
      state: address.state.trim(),
      postalCode: address.postalCode.trim(),
      country: address.country.trim(),
    };

    return {
      valid: true,
      errors: [],
      normalizedAddress,
    };
  }
}

export const addressService = new AddressService();
export default addressService;
