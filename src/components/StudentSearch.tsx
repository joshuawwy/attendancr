"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Student } from "@/types";
import { supabase } from "@/lib/supabase";
import { cn, debounce } from "@/lib/utils";

interface StudentSearchProps {
  onSelect: (student: Student) => void;
  isLoading?: boolean;
}

export function StudentSearch({ onSelect, isLoading = false }: StudentSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Search function
  const searchStudents = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("is_active", true)
        .ilike("name", `%${searchQuery}%`)
        .order("name")
        .limit(10);

      if (error) throw error;
      setResults(data || []);
      setSelectedIndex(-1);
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((q: string) => searchStudents(q), 200),
    [searchStudents]
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case "Escape":
        setQuery("");
        setResults([]);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle student selection
  const handleSelect = (student: Student) => {
    setQuery("");
    setResults([]);
    setSelectedIndex(-1);
    onSelect(student);
    inputRef.current?.focus();
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  return (
    <div className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search student by name..."
          disabled={isLoading}
          className={cn(
            "w-full px-6 py-4 text-xl border-2 border-gray-300 rounded-xl",
            "focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none",
            "transition-all touch-target",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
          aria-label="Search for student"
          aria-autocomplete="list"
          aria-expanded={results.length > 0}
        />

        {/* Search Icon / Loading Spinner */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <svg className="animate-spin h-6 w-6 text-gray-400" viewBox="0 0 24 24">
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
          ) : (
            <svg
              className="h-6 w-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      {results.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-auto"
          role="listbox"
        >
          {results.map((student, index) => (
            <li
              key={student.id}
              onClick={() => handleSelect(student)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                "px-6 py-4 cursor-pointer transition-colors touch-target",
                "border-b border-gray-100 last:border-b-0",
                index === selectedIndex
                  ? "bg-primary-50 text-primary-700"
                  : "hover:bg-gray-50"
              )}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-medium">{student.name}</p>
                  {student.school && (
                    <p className="text-sm text-gray-500">{student.school}</p>
                  )}
                </div>
                <span className="text-sm text-gray-400">{student.student_id}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* No Results Message */}
      {query.length >= 2 && results.length === 0 && !isSearching && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-6 text-center text-gray-500">
          No students found for &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
