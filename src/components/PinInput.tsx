"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface PinInputProps {
  onComplete: (pin: string) => void;
  isLoading?: boolean;
  error?: string;
}

export function PinInput({ onComplete, isLoading = false, error }: PinInputProps) {
  const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    // Clear PIN on error
    if (error) {
      setPin(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  }, [error]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (value && index === 5) {
      const completePin = newPin.join("");
      if (completePin.length === 6) {
        onComplete(completePin);
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length === 6) {
      const newPin = pastedData.split("");
      setPin(newPin);
      onComplete(pastedData);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-3">
        {pin.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={isLoading}
            className={cn(
              "pin-input",
              error && "border-error-500 shake",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
            aria-label={`PIN digit ${index + 1}`}
          />
        ))}
      </div>

      {error && (
        <p className="text-error-500 text-sm font-medium animate-pulse">{error}</p>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-500">
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
          <span>Verifying...</span>
        </div>
      )}
    </div>
  );
}
