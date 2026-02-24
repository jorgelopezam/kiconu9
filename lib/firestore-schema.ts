/**
 * Firestore Database Schema for Kiconu App
 * 
 * Collections:
 * - users: User profiles and account information
 * - user_weights: Weight tracking logs for users
 * - user_objectives: User goals and objectives tracking
 */

export type UserType = "base" | "kiconu" | "premium" | "admin" | "inactive" | null;

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
  assignedCoaches?: string[]; // Array of coach user IDs assigned to this user
  isCoach?: boolean;
  color?: string; // Hex color code or Tailwind class for coach identification
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
  thumbnail_url?: string | null;
  intro_video_url?: string | null;
  access_level: CourseAccessLevel;
  status: CourseStatus;
  created_at: Date;
  created_by: string; // user_id of admin who created
}

// Course content types
export type CourseItemType = "image" | "audio" | "video" | "document";

export interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  order: number;
  created_at: Date;
}

export interface CourseItem {
  id: string;
  section_id: string;
  course_id: string;
  title: string;
  type: CourseItemType;
  file_url: string;           // Firebase Storage URL for image/audio/document
  mux_playback_id?: string;   // For videos
  mux_asset_id?: string;      // For videos
  order: number;
  created_at: Date;
}

export interface Meditation {
  id: string;
  title: string;
  file_url: string;
  duration?: number; // Duration in seconds
  created_at: Date;
  created_by: string; // admin user id
}

// Kiconu Program Content types
export type KiconuContentType = "image" | "audio" | "video" | "document";

export interface KiconuContent {
  id: string;
  title: string;
  description?: string;
  type: KiconuContentType;
  phase: 1 | 2 | 3;
  order: number;
  file_url: string;           // Firebase Storage URL for image/audio/document
  mux_playback_id?: string;   // For videos
  mux_asset_id?: string;      // For videos
  thumbnail_url?: string;     // For videos
  duration?: number;          // For videos/audio in seconds
  created_at: Date;
  created_by: string;         // admin user id
}

// Availability Rules
export type AvailabilityType = "range" | "periodicity";
export type AvailabilityStatus = "available" | "unavailable";

export interface SessionAvailability {
  id: string;
  user_id: string; // admin user id
  type: AvailabilityType;
  status: AvailabilityStatus;
  start_date: Date;
  end_date: Date;
  start_time: string; // "HH:MM" 24h format
  end_time: string;   // "HH:MM" 24h format
  days_of_week?: number[]; // 0-6, 0 is Sunday. Required for periodicity
  created_at: Date;
}

// Questionnaire types
export type QuestionType = "multiple_choice" | "open";
export type QuestionnaireStatus = "active" | "draft";

export interface Questionnaire {
  id: string;
  title: string;
  created_by: string;       // user_id of coach/admin who created
  created_at: Date;
  updated_at: Date;
  status: QuestionnaireStatus;
}

export interface QuestionnaireQuestion {
  id: string;
  questionnaire_id: string;
  question_text: string;
  question_type: QuestionType;
  options?: string[];       // Only for multiple_choice
  order: number;
  created_at: Date;
}

export interface AssignedQuestionnaire {
  id: string;
  user_id: string;        // The client
  assigned_by: string;    // The coach
  title: string;
  status: "pending" | "completed";
  created_at: Date;
  updated_at: Date;
}

export interface AssignedQuestionnaireQuestion {
  id: string;
  assigned_questionnaire_id: string;
  user_id: string;        // Denormalized for security rules
  question_text: string;
  question_type: QuestionType;
  options?: string[];
  order: number;
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
  COURSE_SECTIONS: "course_sections",
  COURSE_ITEMS: "course_items",
  MEDITATIONS: "meditations",
  KICONU_CONTENT: "kiconu_content",
  SESSIONS_AVAILABILITY: "sessionsAvailability",
  QUESTIONNAIRES: "questionnaires",
  QUESTIONNAIRE_QUESTIONS: "questionnaire_questions",
  ASSIGNED_QUESTIONNAIRES: "assigned_questionnaires",
  ASSIGNED_QUESTIONNAIRE_QUESTIONS: "assigned_questionnaire_questions",
} as const;

