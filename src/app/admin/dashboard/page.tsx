"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession, clearAdminSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn, formatDateSGT, formatSGT } from "@/lib/utils";
import { AttendanceWithDetails, Staff, GoogleSheetsSyncLog, FailedNotification } from "@/types";

type Tab = "attendance" | "staff" | "telegram" | "sync" | "notifications";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("attendance");
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    const session = getAdminSession();
    if (!session) {
      router.push("/admin");
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    clearAdminSession();
    router.push("/admin");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Attendancr Admin</h1>
            <p className="text-sm text-gray-500">Management Dashboard</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex space-x-8">
            {[
              { id: "attendance", label: "Attendance" },
              { id: "staff", label: "Staff" },
              { id: "telegram", label: "Telegram Links" },
              { id: "sync", label: "Google Sheets Sync" },
              { id: "notifications", label: "Failed Notifications" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={cn(
                  "py-4 px-1 border-b-2 font-medium text-sm",
                  activeTab === tab.id
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-6">
        {activeTab === "attendance" && <AttendanceTab />}
        {activeTab === "staff" && <StaffTab />}
        {activeTab === "telegram" && <TelegramTab />}
        {activeTab === "sync" && <SyncTab />}
        {activeTab === "notifications" && <NotificationsTab />}
      </main>
    </div>
  );
}

// Attendance Tab Component
function AttendanceTab() {
  const [attendance, setAttendance] = useState<AttendanceWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    fetchAttendance();
  }, [dateFilter]);

  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const startOfDay = new Date(dateFilter);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateFilter);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          students:student_id (name),
          staff:checked_in_by (name)
        `)
        .gte("check_in_time", startOfDay.toISOString())
        .lte("check_in_time", endOfDay.toISOString())
        .order("check_in_time", { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((row: any) => ({
        ...row,
        student_name: row.students?.name || "Unknown",
        checked_in_by_name: row.staff?.name || "Unknown",
      }));

      setAttendance(formatted);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Attendance Records</h2>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : attendance.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No attendance records for this date.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checked by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {attendance.map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{record.student_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatSGT(record.check_in_time)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {record.check_out_time ? formatSGT(record.check_out_time) : "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{record.checked_in_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-4 border-t border-gray-200 text-sm text-gray-500">
        Total: {attendance.length} check-ins
      </div>
    </div>
  );
}

// Staff Tab Component
function StaffTab() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffPin, setNewStaffPin] = useState("");
  const [addError, setAddError] = useState("");

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .order("name");

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    if (!/^\d{6}$/.test(newStaffPin)) {
      setAddError("PIN must be exactly 6 digits");
      return;
    }

    try {
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStaffName, pin: newStaffPin }),
      });

      const data = await response.json();

      if (data.success) {
        setShowAddModal(false);
        setNewStaffName("");
        setNewStaffPin("");
        fetchStaff();
      } else {
        setAddError(data.error || "Failed to add staff");
      }
    } catch {
      setAddError("Failed to add staff");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Staff Members</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            + Add Staff
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {staff.map((member) => (
            <div key={member.id} className="p-6 flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{member.name}</p>
                <p className="text-sm text-gray-500">
                  Added {formatDateSGT(member.created_at)}
                </p>
              </div>
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-sm",
                  member.is_active
                    ? "bg-success-50 text-success-600"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {member.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Add New Staff</h3>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Staff name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">6-digit PIN</label>
                <input
                  type="text"
                  value={newStaffPin}
                  onChange={(e) => setNewStaffPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-center tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
              {addError && <p className="text-error-500 text-sm">{addError}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Add Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Telegram Links Tab Component
function TelegramTab() {
  const [parents, setParents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  useEffect(() => {
    fetchParents();
  }, []);

  const fetchParents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("parents")
        .select("*")
        .order("name");

      if (error) throw error;
      setParents(data || []);
    } catch (error) {
      console.error("Error fetching parents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateLink = async (parentId: string) => {
    setGeneratingFor(parentId);
    try {
      const response = await fetch("/api/telegram/generate-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent_id: parentId }),
      });

      const data = await response.json();
      if (data.link) {
        setGeneratedLink(data.link);
      }
    } catch (error) {
      console.error("Error generating link:", error);
    } finally {
      setGeneratingFor(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Telegram Link Generator</h2>
        <p className="text-sm text-gray-500 mt-1">
          Generate unique links for parents to link their Telegram account.
        </p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {parents.map((parent) => (
            <div key={parent.id} className="p-6 flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{parent.name}</p>
                <p className="text-sm text-gray-500">{parent.phone}</p>
              </div>
              <div className="flex items-center gap-4">
                {parent.telegram_chat_id ? (
                  <span className="text-success-600 text-sm">✓ Linked</span>
                ) : (
                  <button
                    onClick={() => handleGenerateLink(parent.id)}
                    disabled={generatingFor === parent.id}
                    className="px-4 py-2 text-sm border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50"
                  >
                    {generatingFor === parent.id ? "Generating..." : "Generate Link"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generated Link Modal */}
      {generatedLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Telegram Link Generated</h3>
            <p className="text-sm text-gray-600 mb-4">
              Share this link with the parent. It will expire in 24 hours.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4 break-all font-mono text-sm">
              {generatedLink}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedLink);
                setGeneratedLink(null);
              }}
              className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Copy & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Sync Tab Component
function SyncTab() {
  const [syncLogs, setSyncLogs] = useState<GoogleSheetsSyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  useEffect(() => {
    fetchSyncLogs();
  }, []);

  const fetchSyncLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("google_sheets_sync_log")
        .select("*")
        .order("sync_started_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setSyncLogs(data || []);
    } catch (error) {
      console.error("Error fetching sync logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch("/api/sheets/sync", { method: "POST" });
      const data = await response.json();
      setSyncResult(data);
      fetchSyncLogs();
    } catch (error) {
      setSyncResult({ success: false, error: "Sync failed" });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Google Sheets Sync</h2>
            <p className="text-sm text-gray-500 mt-1">
              Auto-syncs daily at midnight SGT. Click to sync manually.
            </p>
          </div>
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className={cn(
              "px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700",
              isSyncing && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSyncing ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      </div>

      {syncResult && (
        <div className={cn(
          "p-4 mx-6 mt-4 rounded-lg",
          syncResult.success ? "bg-success-50 text-success-700" : "bg-error-50 text-error-700"
        )}>
          {syncResult.success ? (
            <p>
              Sync complete! Added: {syncResult.students_added}, Updated: {syncResult.students_updated}, Deleted: {syncResult.students_deleted}
            </p>
          ) : (
            <p>Sync failed: {syncResult.error}</p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {syncLogs.map((log) => (
            <div key={log.id} className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">
                    {formatDateSGT(log.sync_started_at)} at {formatSGT(log.sync_started_at)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Added: {log.students_added} | Updated: {log.students_updated} | Deleted: {log.students_deleted}
                  </p>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-sm",
                  log.status === "success" ? "bg-success-50 text-success-600" :
                  log.status === "failed" ? "bg-error-50 text-error-600" :
                  "bg-yellow-50 text-yellow-600"
                )}>
                  {log.status}
                </span>
              </div>
              {log.error_message && (
                <p className="mt-2 text-sm text-error-600">{log.error_message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Notifications Tab Component
function NotificationsTab() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("failed_notifications")
        .select(`
          *,
          students:student_id (name),
          parents:parent_id (name, phone)
        `)
        .order("attempted_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Failed Notifications</h2>
        <p className="text-sm text-gray-500 mt-1">
          Notifications that failed to send. Auto-deleted after 7 days.
        </p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No failed notifications.
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {notifications.map((notification) => (
            <div key={notification.id} className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">
                    {notification.students?.name || "Unknown Student"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Parent: {notification.parents?.name || "Unknown"} ({notification.parents?.phone || "No phone"})
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  {formatDateSGT(notification.attempted_at)}
                </span>
              </div>
              {notification.error_message && (
                <p className="mt-2 text-sm text-error-600 bg-error-50 rounded px-2 py-1 inline-block">
                  {notification.error_message}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
