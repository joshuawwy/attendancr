import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility to merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format time in Singapore timezone (SGT/UTC+8)
export function formatSGT(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-SG", {
    timeZone: "Asia/Singapore",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Format date in Singapore timezone
export function formatDateSGT(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Get current time in SGT as ISO string
export function nowSGT(): string {
  return new Date().toISOString();
}

// Generate a random 6-character alphanumeric code
export function generateLinkCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluded confusing chars: I, O, 0, 1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Staff session duration: 8 hours in milliseconds
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

// Check if staff session is still valid
export function isSessionValid(expiresAt: number): boolean {
  return Date.now() < expiresAt;
}

// Debounce function for search input
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Validate 6-digit PIN format
export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

// Mask phone number for display (show last 4 digits)
export function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return "****" + phone.slice(-4);
}

// Simple toast message display (client-side only)
export function showToast(message: string, type: "success" | "error" = "success") {
  if (typeof window === "undefined") return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2000);
}

// Check internet connectivity
export async function checkConnectivity(): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return false;
  }

  try {
    const response = await fetch("/api/health", { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}
