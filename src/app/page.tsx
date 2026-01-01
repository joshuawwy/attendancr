"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PinInput } from "@/components/PinInput";
import { StudentSearch } from "@/components/StudentSearch";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Toast, useToast } from "@/components/Toast";
import { Student, StaffSession, CheckInResponse } from "@/types";
import { getSession, clearSession, createSession, authenticateStaff } from "@/lib/auth";
import { formatSGT, checkConnectivity } from "@/lib/utils";

type AppState = "loading" | "login" | "search" | "confirm" | "offline";

export default function HomePage() {
  const router = useRouter();
  const [appState, setAppState] = useState<AppState>("loading");
  const [session, setSession] = useState<StaffSession | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loginError, setLoginError] = useState<string>("");
  const { toast, showToast, hideToast } = useToast();

  // Check session and connectivity on mount
  useEffect(() => {
    const init = async () => {
      const isOnline = await checkConnectivity();
      if (!isOnline) {
        setAppState("offline");
        return;
      }

      const existingSession = getSession();
      if (existingSession) {
        setSession(existingSession);
        setAppState("search");
      } else {
        setAppState("login");
      }
    };

    init();

    // Listen for online/offline events
    const handleOnline = () => setAppState("search");
    const handleOffline = () => setAppState("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Handle PIN submission
  const handlePinSubmit = async (pin: string) => {
    setIsProcessing(true);
    setLoginError("");

    try {
      const result = await authenticateStaff(pin);

      if (result.success && result.staff) {
        const newSession = createSession(result.staff.id, result.staff.name);
        setSession(newSession);
        setAppState("search");
      } else {
        setLoginError(result.error || "Invalid PIN");
      }
    } catch {
      setLoginError("Authentication failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle student selection
  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setAppState("confirm");
  };

  // Handle check-in confirmation
  const handleCheckInConfirm = async () => {
    if (!selectedStudent || !session) return;

    setIsProcessing(true);

    try {
      const response = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          staff_id: session.staff_id,
          check_in_time: new Date().toISOString(),
        }),
      });

      const data: CheckInResponse = await response.json();

      if (data.success) {
        showToast(`${selectedStudent.name} checked in ✓`, "success");
      } else {
        showToast(data.error || "Check-in failed", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsProcessing(false);
      setSelectedStudent(null);
      setAppState("search");
    }
  };

  // Handle logout
  const handleLogout = () => {
    clearSession();
    setSession(null);
    setAppState("login");
  };

  // Render loading state
  if (appState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto text-primary-600" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render offline state
  if (appState === "offline") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <svg
            className="h-16 w-16 mx-auto text-error-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728m12.728 0a9 9 0 01-12.728 0m12.728-12.728a9 9 0 00-12.728 0M12 9v2m0 4h.01"
            />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Internet Connection</h1>
          <p className="text-gray-600 mb-6">
            Please check your WiFi connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-6 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render login state
  if (appState === "login") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Attendancr</h1>
            <p className="text-gray-600">Enter your 6-digit PIN to continue</p>
          </div>

          <PinInput
            onComplete={handlePinSubmit}
            isLoading={isProcessing}
            error={loginError}
          />
        </div>

        <button
          onClick={() => router.push("/admin")}
          className="mt-8 text-gray-500 hover:text-gray-700 text-sm"
        >
          Admin Login →
        </button>
      </div>
    );
  }

  // Render search/main state
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Attendancr</h1>
            <p className="text-sm text-gray-500">
              Logged in as {session?.staff_name} •{" "}
              <button
                onClick={handleLogout}
                className="text-primary-600 hover:text-primary-700"
              >
                Logout
              </button>
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-medium text-gray-900">
              {formatSGT(new Date())}
            </p>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString("en-SG", {
                timeZone: "Asia/Singapore",
                weekday: "long",
                day: "numeric",
                month: "short"
              })}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center p-6" style={{ minHeight: "calc(100vh - 120px)" }}>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Check-in</h2>
          <p className="text-gray-600">Search for a student to check them in</p>
        </div>

        <StudentSearch onSelect={handleStudentSelect} />
      </main>

      {/* Confirm Modal */}
      {appState === "confirm" && selectedStudent && (
        <ConfirmModal
          student={selectedStudent}
          onConfirm={handleCheckInConfirm}
          onCancel={() => {
            setSelectedStudent(null);
            setAppState("search");
          }}
          isLoading={isProcessing}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
}
