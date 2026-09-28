import { db } from "../config/firebase.js";
import { formatDoc, serverTimestamp } from "../utils/firestore.js";
import { NotFoundError, AppError } from "../errors/AppError.js";
import logger from "../utils/logger.js";

export class BaseRepository {
  /**
   * @param {string} collectionName
   */
  constructor(collectionName) {
    if (!collectionName) {
      throw new Error("BaseRepository requires a valid collectionName");
    }
    this.collectionName = collectionName;
  }

  get collection() {
    return db.collection(this.collectionName);
  }

  /**
   * Creates a new document with automated timestamps
   * @param {Object} data
   * @param {string|null} customId - Optional deterministic document ID
   * @returns {Promise<Object>} Created document entity
   */
  async create(data, customId = null) {
    try {
      const docData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      let docRef;
      if (customId) {
        docRef = this.collection.doc(customId);
        await docRef.set(docData);
      } else {
        docRef = await this.collection.add(docData);
      }

      const snap = await docRef.get();
      return formatDoc(snap);
    } catch (error) {
      logger.error(`Error creating document in ${this.collectionName}`, {
        error: error.message,
        customId,
      });
      throw new AppError(
        `Failed to create record in ${this.collectionName}: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Retrieves a document by its ID
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    try {
      if (!id) return null;
      const snap = await this.collection.doc(id).get();
      if (!snap.exists) return null;
      return formatDoc(snap);
    } catch (error) {
      logger.error(`Error finding document in ${this.collectionName}`, {
        id,
        error: error.message,
      });
      throw new AppError(
        `Failed to fetch record from ${this.collectionName}: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Updates an existing document
   * @param {string} id
   * @param {Object} data
   * @returns {Promise<Object>} Updated document entity
   */
  async update(id, data) {
    try {
      const docRef = this.collection.doc(id);
      const snap = await docRef.get();

      if (!snap.exists) {
        throw new NotFoundError(
          `Document with ID ${id} not found in ${this.collectionName}`,
        );
      }

      const updateData = {
        ...data,
        updatedAt: serverTimestamp(),
      };

      await docRef.update(updateData);
      const updatedSnap = await docRef.get();
      return formatDoc(updatedSnap);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error(`Error updating document in ${this.collectionName}`, {
        id,
        error: error.message,
      });
      throw new AppError(
        `Failed to update record in ${this.collectionName}: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Deletes a document by ID
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    try {
      const docRef = this.collection.doc(id);
      const snap = await docRef.get();

      if (!snap.exists) {
        return false;
      }

      await docRef.delete();
      return true;
    } catch (error) {
      logger.error(`Error deleting document in ${this.collectionName}`, {
        id,
        error: error.message,
      });
      throw new AppError(
        `Failed to delete record in ${this.collectionName}: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Checks if a document exists by ID
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async exists(id) {
    try {
      if (!id) return false;
      const snap = await this.collection.doc(id).get();
      return snap.exists;
    } catch (error) {
      return false;
    }
  }
}

export default BaseRepository;
