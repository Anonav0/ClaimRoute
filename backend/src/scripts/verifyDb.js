import { db } from "../config/firebase.js";
import { BaseRepository } from "../repositories/baseRepository.js";
import { COLLECTIONS } from "../utils/firestore.js";
import logger from "../utils/logger.js";

/**
 * Development & CI Database Verification Script.
 * Verifies repository CRUD operations and timestamp management against Firestore.
 */
async function runVerification() {
  console.log("\n=============================================");
  console.log("  ClaimRoute Firestore Foundation Verification");
  console.log("=============================================\n");

  const testRepo = new BaseRepository(COLLECTIONS.HEALTH_CHECK);
  const testId = `test-verify-${Date.now()}`;

  try {
    console.log(
      `[1/5] Testing Document Creation in '${COLLECTIONS.HEALTH_CHECK}'...`,
    );
    const created = await testRepo.create(
      {
        message: "ClaimRoute database foundation test",
        environment: process.env.NODE_ENV || "development",
      },
      testId,
    );
    console.log("  ✓ Document created successfully:");
    console.log(`    ID: ${created.id}`);
    console.log(`    CreatedAt: ${created.createdAt}`);
    console.log(`    UpdatedAt: ${created.updatedAt}`);

    console.log(`\n[2/5] Testing Document Retrieval by ID...`);
    const retrieved = await testRepo.findById(testId);
    if (!retrieved || retrieved.id !== testId) {
      throw new Error(
        `Retrieved document mismatch: expected ${testId}, got ${retrieved?.id}`,
      );
    }
    console.log("  ✓ Document retrieved successfully.");

    console.log(`\n[3/5] Testing Document Update...`);
    const updated = await testRepo.update(testId, {
      status: "VERIFIED",
    });
    if (updated.status !== "VERIFIED") {
      throw new Error("Update failed: status property not updated");
    }
    console.log("  ✓ Document updated successfully with new timestamp:");
    console.log(`    UpdatedAt: ${updated.updatedAt}`);

    console.log(`\n[4/5] Testing Document Cleanup (Delete)...`);
    const deleted = await testRepo.delete(testId);
    console.log(`  ✓ Document deleted: ${deleted}`);

    console.log(`\n[5/5] Testing Missing Document Handling...`);
    const nonExistent = await testRepo.findById("non-existent-id-12345");
    if (nonExistent !== null) {
      throw new Error("Missing document should return null");
    }
    console.log("  ✓ Correctly returned null for missing document.");

    console.log("\n=============================================");
    console.log("  All Firestore Verification Tests Passed! ✓");
    console.log("=============================================\n");
    process.exit(0);
  } catch (error) {
    console.error("\n✕ Firestore Verification Failed:");
    console.error(error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

runVerification();
