export enum FeedbackStatus {
  NEW = 'new',
  RESOLVED = 'resolved',
  FLAGGED = 'flagged',
  SPAM = 'spam',
  DELETED = 'deleted',
  // Legacy (kept for backward compatibility with any existing localStorage data)
  REVIEWED = 'reviewed'
}

export type FeedbackActivityType =
  | 'created'
  | 'read'
  | 'status'
  | 'email'
  | 'note'
  | 'delete';

export interface FeedbackActivity {
  id: string;
  type: FeedbackActivityType;
  message: string;
  createdAt: string;
  meta?: Record<string, any>;
}

export type LowRatingQuestionType = 'single' | 'multiple';

export interface LowRatingQuestion {
  id: string;
  prompt: string;
  type: LowRatingQuestionType;
  options: string[];
  required?: boolean;
}

export interface BusinessTheme {
  accentColor: string;
  customerBackground?: string;
  dashboardBackground?: string;
  cardBackground?: string;
  /**
   * Optional business logo/avatar image (data URL or public URL).
   * Used in the public review flow and (optionally) inside the portal.
   */
  logoUrl?: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  thresholdRating: number;
  googleReviewUrl: string;
  exitRedirectUrl?: string;
  theme: BusinessTheme;
  lowRatingQuestions?: LowRatingQuestion[];
  contactSettings: {
    notifyEmail?: string;
    enabled: boolean;
  };
  createdAt: string;
}

export interface Feedback {
  id: string;
  businessId: string;
  rating: number;
  comment: string;
  name?: string;
  email?: string;
  photos?: string[]; // base64 strings
  answers?: Record<string, string | string[]>;
  source?: string; // attribution from Links & QR (e.g., table_1, email)

  /**
   * Timeline of actions taken on this feedback (status changes, replies, etc.).
   * Stored client-side until Supabase is connected.
   */
  activity?: FeedbackActivity[];

  /**
   * Read/unread flag for inbox-style workflows.
   * Defaults to false for newly created feedback.
   */
  isRead?: boolean;
  createdAt: string;
  updatedAt?: string;
  status: FeedbackStatus;

  /**
   * Used for reversible status transitions (e.g., Flagged/Deleted -> Undo)
   * without requiring a database.
   */
  previousStatus?: FeedbackStatus;
  deletedAt?: string;
}

export enum UserRole {
  SUPER = 'SUPER',
  ADMIN = 'ADMIN'
}

export interface UserSession {
  role: UserRole;
  businessId?: string; // Only for ADMIN
  impersonating?: boolean;
}

export interface LinkEntry {
  id: string;
  businessId: string;
  label: string;
  source: string; // e.g. table_1, email_footer
  createdAt: string;
}

export type ReviewEventType = 'scan' | 'redirect' | 'internal';

export interface ReviewEvent {
  id: string;
  businessId: string;
  type: ReviewEventType;
  createdAt: string;
  source?: string;
  rating?: number;
}
