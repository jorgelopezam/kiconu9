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
  course_access?: string[]; // Array of course IDs for restricted course access
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

export type VideoCategory = "Nutrición" | "Transpersonal";
export type VideoStatus = "Publicado" | "Borrador";

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  phase: 1 | 2 | 3;
  order: number;
  date_added: Date;
  status: VideoStatus;
  duration: number; // in seconds
  mux_asset_id: string;
  mux_playback_id: string;
  category: VideoCategory;
  created_by: string; // user_id of admin who uploaded
}

export interface UserVideoProgress {
  id: string;
  user_id: string;
  video_id: string;
  watched_seconds: number; // How many seconds the user has watched
  total_duration: number; // Total video duration in seconds
  progress_percentage: number; // Calculated: (watched_seconds / total_duration) * 100
  completed: boolean; // true if progress_percentage >= 90
  last_watched: Date;
  completed_date?: Date; // When the video was marked as completed
}

export interface JournalEntry {
  id: string;
  user_id: string;
  date_added: Date;
  time: string;
  first_question: string;
  second_question: string;
  third_question: string;
}

// Course types
export type CourseAccessLevel = "restricted" | "base" | "kiconu" | "premium" | "all";
export type CourseStatus = "active" | "inactive";

export interface Course {
  id: string;
  title: string;
  access_level: CourseAccessLevel;
  status: CourseStatus;
  created_at: Date;
  created_by: string; // user_id of admin who created
}

/**
 * Collection paths
 */
export const COLLECTIONS = {
  USERS: "users",
  USER_WEIGHTS: "user_weights",
  USER_OBJECTIVES: "user_objectives",
  VIDEOS: "videos",
  USER_VIDEO_PROGRESS: "user_video_progress",
  JOURNAL: "journal",
  COURSES: "courses",
} as const;
