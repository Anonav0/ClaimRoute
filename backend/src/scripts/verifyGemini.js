import dotenv from "dotenv";
dotenv.config();

import { extractDeliveryConstraints } from "../ai/extraction/deliveryExtractor.js";

async function run() {
  console.log("Testing live Gemini integration with ClaimRoute...");
  const sampleNote =
    "Please deliver after 6 PM. Gate code is 4821. Call me when you arrive. I'm vegetarian.";
  console.log(`Input note: "${sampleNote}"\n`);

  try {
    const result = await extractDeliveryConstraints(sampleNote, {
      provider: "google",
    });
    console.log("✓ SUCCESS: Gemini returned valid structured constraints!");
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("✗ Gemini Extraction Failed:", err.message);
    process.exit(1);
  }
}

run();
