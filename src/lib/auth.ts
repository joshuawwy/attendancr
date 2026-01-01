import bcrypt from "bcryptjs";
import { supabase } from "./supabase";
import { Staff, StaffSession } from "@/types";
import { SESSION_DURATION_MS } from "./utils";

const SESSION_KEY = "attendancr_staff_session";

// Hash a PIN for storage
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

// Verify a PIN against its hash
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

// Authenticate staff with PIN
export async function authenticateStaff(
  pin: string
): Promise<{ success: boolean; staff?: Pick<Staff, "id" | "name">; error?: string }> {
  try {
    // Fetch all active staff (PIN authentication needs to check all)
    const { data: staffList, error } = await supabase
      .from("staff")
      .select("id, name, pin_hash")
      .eq("is_active", true);

    if (error) {
      return { success: false, error: "Database error" };
    }

    if (!staffList || staffList.length === 0) {
      return { success: false, error: "No staff found" };
    }

    // Check PIN against each staff member
    for (const staff of staffList) {
      const isMatch = await verifyPin(pin, staff.pin_hash);
      if (isMatch) {
        return {
          success: true,
          staff: { id: staff.id, name: staff.name },
        };
      }
    }

    return { success: false, error: "Invalid PIN" };
  } catch {
    return { success: false, error: "Authentication failed" };
  }
}

// Create a session for authenticated staff (client-side storage)
export function createSession(staffId: string, staffName: string): StaffSession {
  const session: StaffSession = {
    staff_id: staffId,
    staff_name: staffName,
    expires_at: Date.now() + SESSION_DURATION_MS,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  return session;
}

// Get current session from storage
export function getSession(): StaffSession | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  try {
    const session: StaffSession = JSON.parse(stored);
    if (Date.now() >= session.expires_at) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

// Clear session from storage
export function clearSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

// Admin authentication (email/password)
export async function authenticateAdmin(
  email: string,
  password: string
): Promise<{ success: boolean; adminId?: string; error?: string }> {
  try {
    const { data: admin, error } = await supabase
      .from("admins")
      .select("id, password_hash")
      .eq("email", email.toLowerCase())
      .single();

    if (error || !admin) {
      return { success: false, error: "Invalid credentials" };
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return { success: false, error: "Invalid credentials" };
    }

    return { success: true, adminId: admin.id };
  } catch {
    return { success: false, error: "Authentication failed" };
  }
}

// Admin session management (separate from staff)
const ADMIN_SESSION_KEY = "attendancr_admin_session";
const ADMIN_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface AdminSession {
  admin_id: string;
  expires_at: number;
}

export function createAdminSession(adminId: string): AdminSession {
  const session: AdminSession = {
    admin_id: adminId,
    expires_at: Date.now() + ADMIN_SESSION_DURATION_MS,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  }

  return session;
}

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(ADMIN_SESSION_KEY);
  if (!stored) return null;

  try {
    const session: AdminSession = JSON.parse(stored);
    if (Date.now() >= session.expires_at) {
      clearAdminSession();
      return null;
    }
    return session;
  } catch {
    clearAdminSession();
    return null;
  }
}

export function clearAdminSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  }
}
