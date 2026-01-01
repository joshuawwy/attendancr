import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Client-side Supabase client (lazy initialization)
let _supabase: SupabaseClient | null = null;

export const supabase = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client for build time
    return {
      from: () => ({
        select: () => ({ data: null, error: { message: "Supabase not configured" } }),
        insert: () => ({ data: null, error: { message: "Supabase not configured" } }),
        update: () => ({ data: null, error: { message: "Supabase not configured" } }),
        delete: () => ({ data: null, error: { message: "Supabase not configured" } }),
        upsert: () => ({ data: null, error: { message: "Supabase not configured" } }),
      }),
    } as unknown as SupabaseClient;
  }
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
})();

// Server-side Supabase client with service role key (for admin operations)
export function createServerSupabaseClient(): SupabaseClient {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase environment variables not configured");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Database types for Supabase
export type Database = {
  public: {
    Tables: {
      students: {
        Row: {
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
        };
        Insert: Omit<Database["public"]["Tables"]["students"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["students"]["Insert"]>;
      };
      parents: {
        Row: {
          id: string;
          name: string;
          phone: string;
          telegram_chat_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["parents"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["parents"]["Insert"]>;
      };
      staff: {
        Row: {
          id: string;
          name: string;
          pin_hash: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["staff"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["staff"]["Insert"]>;
      };
      admins: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["admins"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["admins"]["Insert"]>;
      };
      attendance: {
        Row: {
          id: string;
          student_id: string;
          check_in_time: string;
          check_out_time: string | null;
          checked_in_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["attendance"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["attendance"]["Insert"]>;
      };
      failed_notifications: {
        Row: {
          id: string;
          student_id: string;
          parent_id: string;
          error_message: string | null;
          attempted_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["failed_notifications"]["Row"], "id" | "attempted_at">;
        Update: Partial<Database["public"]["Tables"]["failed_notifications"]["Insert"]>;
      };
      google_sheets_sync_log: {
        Row: {
          id: string;
          sync_started_at: string;
          sync_completed_at: string | null;
          status: string;
          error_message: string | null;
          students_added: number;
          students_updated: number;
          students_deleted: number;
        };
        Insert: Omit<Database["public"]["Tables"]["google_sheets_sync_log"]["Row"], "id" | "sync_started_at">;
        Update: Partial<Database["public"]["Tables"]["google_sheets_sync_log"]["Insert"]>;
      };
      telegram_link_codes: {
        Row: {
          id: string;
          code: string;
          parent_id: string;
          created_at: string;
          expires_at: string;
          used: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["telegram_link_codes"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["telegram_link_codes"]["Insert"]>;
      };
    };
  };
};
