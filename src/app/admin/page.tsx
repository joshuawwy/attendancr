"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession, clearAdminSession, createAdminSession, authenticateAdmin } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Check for existing session
  useEffect(() => {
    const session = getAdminSession();
    if (session) {
      router.push("/admin/dashboard");
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await authenticateAdmin(email, password);

      if (result.success && result.adminId) {
        createAdminSession(result.adminId);
        router.push("/admin/dashboard");
      } else {
        setError(result.error || "Invalid credentials");
        setIsLoading(false);
      }
    } catch {
      setError("Login failed. Please try again.");
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Login</h1>
          <p className="text-gray-600">Attendancr Management Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-error-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full py-3 px-6 rounded-lg font-medium text-white",
              "bg-primary-600 hover:bg-primary-700 transition-colors",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>

      <button
        onClick={() => router.push("/")}
        className="mt-8 text-gray-500 hover:text-gray-700 text-sm"
      >
        ← Back to Staff Login
      </button>
    </div>
  );
}
