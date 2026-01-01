"use client";

import { Student } from "@/types";
import { cn } from "@/lib/utils";

interface ConfirmModalProps {
  student: Student;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmModal({
  student,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h2 id="confirm-title" className="text-2xl font-bold text-center mb-6">
          Check in {student.name}?
        </h2>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-500">Student ID:</dt>
              <dd className="font-medium">{student.student_id}</dd>
            </div>
            {student.school && (
              <div className="flex justify-between">
                <dt className="text-gray-500">School:</dt>
                <dd className="font-medium">{student.school}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className={cn(
              "flex-1 py-4 px-6 rounded-xl border-2 border-gray-300",
              "text-lg font-medium text-gray-700",
              "hover:bg-gray-100 transition-colors touch-target",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "flex-1 py-4 px-6 rounded-xl",
              "text-lg font-medium text-white",
              "bg-primary-600 hover:bg-primary-700 transition-colors touch-target",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
                Checking in...
              </span>
            ) : (
              "Check In"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
