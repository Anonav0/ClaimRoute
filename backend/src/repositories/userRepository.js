import { BaseRepository } from "./baseRepository.js";
import { COLLECTIONS, formatDoc } from "../utils/firestore.js";

export class UserRepository extends BaseRepository {
  constructor() {
    super(COLLECTIONS.USERS);
  }

  /**
   * Find a user by their email address
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    if (!email) return null;
    const snap = await this.collection
      .where("email", "==", email.toLowerCase().trim())
      .limit(1)
      .get();
    if (snap.empty) return null;
    return formatDoc(snap.docs[0]);
  }
}

export const userRepository = new UserRepository();
export default userRepository;
