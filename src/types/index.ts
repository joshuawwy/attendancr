// Database types matching Supabase schema

export interface Student {
  id: string;
  student_id: string;
  name: string;
  school: string | null;
  date_of_birth: string | null;
  emergency_contact: string | null;
  notes: string | null;
  primary_parent_id: string | null;
  secondary_parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Parent {
  id: string;
  name: string;
  phone: string;
  telegram_chat_id: string | null;
  created_at: string;
}

export interface Staff {
  id: string;
  name: string;
  pin_hash: string;
  is_active: boolean;
  created_at: string;
}

export interface Admin {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  check_in_time: string;
  check_out_time: string | null;
  checked_in_by: string;
  created_at: string;
}

export interface AttendanceWithDetails extends Attendance {
  student_name: string;
  checked_in_by_name: string;
}

export interface FailedNotification {
  id: string;
  student_id: string;
  parent_id: string;
  error_message: string | null;
  attempted_at: string;
}

export interface GoogleSheetsSyncLog {
  id: string;
  sync_started_at: string;
  sync_completed_at: string | null;
  status: "success" | "failed" | "in_progress";
  error_message: string | null;
  students_added: number;
  students_updated: number;
  students_deleted: number;
}

// API request/response types

export interface CheckInRequest {
  student_id: string;
  staff_id: string;
  check_in_time: string;
}

export interface CheckInResponse {
  success: boolean;
  attendance_id?: string;
  notification_sent: boolean;
  notification_errors?: string[];
  error?: string;
}

export interface StaffSession {
  staff_id: string;
  staff_name: string;
  expires_at: number; // Unix timestamp
}

export interface TelegramLinkCode {
  code: string;
  parent_id: string;
  created_at: string;
  expires_at: string;
  used: boolean;
}

// Google Sheets row format
export interface GoogleSheetsStudentRow {
  "Student ID": string;
  "Student Name": string;
  School?: string;
  "Date of Birth"?: string;
  "Emergency Contact"?: string;
  Notes?: string;
  "Primary Parent Name": string;
  "Primary Parent Phone": string;
  "Primary Parent Telegram"?: string;
  "Secondary Parent Name"?: string;
  "Secondary Parent Phone"?: string;
  "Secondary Parent Telegram"?: string;
}
