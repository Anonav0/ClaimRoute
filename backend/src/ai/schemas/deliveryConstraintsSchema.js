/**
 * JSON Schema definition of DeliveryConstraints (Phase 7)
 * Used by LangChain ChatModel structured output and tools.
 */
export const DELIVERY_CONSTRAINTS_JSON_SCHEMA = {
  name: "delivery_constraints",
  description:
    "Extract structured delivery constraints, access instructions, and dietary restrictions from delivery notes",
  schema: {
    type: "object",
    properties: {
      deliveryWindow: {
        type: ["object", "null"],
        description:
          "Target delivery window if recipient mentioned specific times or timeframes",
        properties: {
          start: {
            type: ["string", "null"],
            description: "Start time in 24-hour HH:MM format (e.g. '18:00')",
          },
          end: {
            type: ["string", "null"],
            description: "End time in 24-hour HH:MM format (e.g. '21:00')",
          },
          raw: {
            type: ["string", "null"],
            description:
              "Original unparsed phrasing if ambiguous (e.g. 'evening', 'before lunch')",
          },
        },
        required: ["start", "end", "raw"],
        additionalProperties: false,
      },
      accessInstructions: {
        type: "array",
        items: { type: "string" },
        description:
          "Instructions for physical property access (e.g. gate codes, call on intercom)",
      },
      dietaryConstraints: {
        type: "array",
        items: { type: "string" },
        description:
          "Dietary requirements or restrictions (e.g. Vegetarian, Halal, Nut allergy)",
      },
      deliveryInstructions: {
        type: "array",
        items: { type: "string" },
        description:
          "General package drop-off or handling instructions (e.g. leave with security)",
      },
    },
    required: [
      "deliveryWindow",
      "accessInstructions",
      "dietaryConstraints",
      "deliveryInstructions",
    ],
    additionalProperties: false,
  },
};

export default DELIVERY_CONSTRAINTS_JSON_SCHEMA;
