import { getFirestore } from "firebase/firestore";
import { app } from "./firebase";

// Initialize Firestore
export const db = getFirestore(app);

// Export collection names
export { COLLECTIONS } from "./firestore-schema";
export type {
  User,
  UserWeight,
  UserObjective,
  UserType,
  ObjectiveStatus,
  JournalEntry,
} from "./firestore-schema";
