/**
 * Firestore Database Schema for Kiconu App
 * 
 * Collections:
 * - users: User profiles and account information
 * - user_weights: Weight tracking logs for users
 * - user_objectives: User goals and objectives tracking
 */

export type UserType = "base" | "kiconu" | "premium" | "admin" | null;

export type ObjectiveStatus = "in_progress" | "completed";

export interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  registration_date: Date;
  age?: number;
  height?: number; // in cm
  weight?: number; // in kg
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  user_type: UserType;  // null means not yet selected (needs to go to payment)
  is_admin: boolean;
}

export interface UserWeight {
  id: string;
  user_id: string;
  date: Date;
  weight: number; // in kg
}

export interface UserObjective {
  id: string;
  user_id: string;
  date_added: Date;
  objective: string;
  status: ObjectiveStatus;
}

/**
 * Collection paths
 */
export const COLLECTIONS = {
  USERS: "users",
  USER_WEIGHTS: "user_weights",
  USER_OBJECTIVES: "user_objectives",
} as const;
