import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { GoogleSheetsStudentRow } from "@/types";

export const dynamic = "force-dynamic";

const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

interface SyncResult {
  success: boolean;
  students_added: number;
  students_updated: number;
  students_deleted: number;
  errors?: string[];
}

export async function POST(): Promise<Response> {
  const supabase = createServerSupabaseClient();
  const errors: string[] = [];
  let studentsAdded = 0;
  let studentsUpdated = 0;
  let studentsDeleted = 0;

  // Create sync log entry
  const { data: syncLog, error: logError } = await supabase
    .from("google_sheets_sync_log")
    .insert({
      status: "in_progress",
      students_added: 0,
      students_updated: 0,
      students_deleted: 0,
    })
    .select("id")
    .single();

  if (logError || !syncLog) {
    return NextResponse.json<SyncResult>({
      success: false,
      students_added: 0,
      students_updated: 0,
      students_deleted: 0,
      errors: ["Failed to create sync log"],
    });
  }

  try {
    if (!GOOGLE_SHEETS_API_KEY || !GOOGLE_SHEET_ID) {
      throw new Error("Google Sheets API not configured");
    }

    // Fetch data from Google Sheets
    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/Sheet1?key=${GOOGLE_SHEETS_API_KEY}`;
    const response = await fetch(sheetUrl);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Sheets API error: ${errorText}`);
    }

    const data = await response.json();
    const rows = data.values as string[][];

    if (!rows || rows.length < 2) {
      throw new Error("No data found in sheet");
    }

    // Parse headers (first row)
    const headers = rows[0];
    const headerMap: Record<string, number> = {};
    headers.forEach((header, index) => {
      headerMap[header.trim()] = index;
    });

    // Validate required columns
    const requiredColumns = ["Student ID", "Student Name", "Primary Parent Name", "Primary Parent Phone"];
    for (const col of requiredColumns) {
      if (!(col in headerMap)) {
        throw new Error(`Missing required column: ${col}`);
      }
    }

    // Parse data rows
    const sheetStudents: GoogleSheetsStudentRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      try {
        const studentId = row[headerMap["Student ID"]]?.trim();
        const studentName = row[headerMap["Student Name"]]?.trim();
        const primaryParentName = row[headerMap["Primary Parent Name"]]?.trim();
        const primaryParentPhone = row[headerMap["Primary Parent Phone"]]?.trim();

        if (!studentId || !studentName || !primaryParentName || !primaryParentPhone) {
          errors.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }

        sheetStudents.push({
          "Student ID": studentId,
          "Student Name": studentName,
          "School": row[headerMap["School"]]?.trim() || undefined,
          "Date of Birth": row[headerMap["Date of Birth"]]?.trim() || undefined,
          "Emergency Contact": row[headerMap["Emergency Contact"]]?.trim() || undefined,
          "Notes": row[headerMap["Notes"]]?.trim() || undefined,
          "Primary Parent Name": primaryParentName,
          "Primary Parent Phone": primaryParentPhone,
          "Primary Parent Telegram": row[headerMap["Primary Parent Telegram"]]?.trim() || undefined,
          "Secondary Parent Name": row[headerMap["Secondary Parent Name"]]?.trim() || undefined,
          "Secondary Parent Phone": row[headerMap["Secondary Parent Phone"]]?.trim() || undefined,
          "Secondary Parent Telegram": row[headerMap["Secondary Parent Telegram"]]?.trim() || undefined,
        });
      } catch (err) {
        errors.push(`Row ${i + 1}: Parse error`);
      }
    }

    // Get existing students
    const { data: existingStudents } = await supabase
      .from("students")
      .select("id, student_id");

    const existingStudentMap = new Map(
      (existingStudents || []).map(s => [s.student_id, s.id])
    );

    const sheetStudentIds = new Set(sheetStudents.map(s => s["Student ID"]));

    // Process each student from the sheet
    for (const sheetStudent of sheetStudents) {
      try {
        // Upsert primary parent
        const { data: primaryParent, error: primaryParentError } = await supabase
          .from("parents")
          .upsert(
            {
              name: sheetStudent["Primary Parent Name"],
              phone: sheetStudent["Primary Parent Phone"],
            },
            { onConflict: "phone" }
          )
          .select("id")
          .single();

        if (primaryParentError) {
          // Try to find existing parent by phone
          const { data: existingParent } = await supabase
            .from("parents")
            .select("id")
            .eq("phone", sheetStudent["Primary Parent Phone"])
            .single();

          if (!existingParent) {
            errors.push(`Student ${sheetStudent["Student ID"]}: Failed to create primary parent`);
            continue;
          }
        }

        const primaryParentId = primaryParent?.id;

        // Upsert secondary parent if provided
        let secondaryParentId: string | null = null;
        if (sheetStudent["Secondary Parent Name"] && sheetStudent["Secondary Parent Phone"]) {
          const { data: secondaryParent } = await supabase
            .from("parents")
            .upsert(
              {
                name: sheetStudent["Secondary Parent Name"],
                phone: sheetStudent["Secondary Parent Phone"],
              },
              { onConflict: "phone" }
            )
            .select("id")
            .single();

          secondaryParentId = secondaryParent?.id || null;
        }

        // Check if student exists
        const existingId = existingStudentMap.get(sheetStudent["Student ID"]);

        const studentData = {
          student_id: sheetStudent["Student ID"],
          name: sheetStudent["Student Name"],
          school: sheetStudent["School"] || null,
          date_of_birth: sheetStudent["Date of Birth"] || null,
          emergency_contact: sheetStudent["Emergency Contact"] || null,
          notes: sheetStudent["Notes"] || null,
          primary_parent_id: primaryParentId,
          secondary_parent_id: secondaryParentId,
          is_active: true,
          updated_at: new Date().toISOString(),
        };

        if (existingId) {
          // Update existing student
          await supabase
            .from("students")
            .update(studentData)
            .eq("id", existingId);
          studentsUpdated++;
        } else {
          // Insert new student
          await supabase
            .from("students")
            .insert(studentData);
          studentsAdded++;
        }
      } catch (err) {
        errors.push(`Student ${sheetStudent["Student ID"]}: Processing error`);
      }
    }

    // Soft delete students not in sheet
    for (const [studentId, id] of existingStudentMap) {
      if (!sheetStudentIds.has(studentId)) {
        await supabase
          .from("students")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", id);
        studentsDeleted++;
      }
    }

    // Update sync log
    await supabase
      .from("google_sheets_sync_log")
      .update({
        status: "success",
        sync_completed_at: new Date().toISOString(),
        students_added: studentsAdded,
        students_updated: studentsUpdated,
        students_deleted: studentsDeleted,
        error_message: errors.length > 0 ? errors.join("; ") : null,
      })
      .eq("id", syncLog.id);

    return NextResponse.json<SyncResult>({
      success: true,
      students_added: studentsAdded,
      students_updated: studentsUpdated,
      students_deleted: studentsDeleted,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Update sync log with failure
    await supabase
      .from("google_sheets_sync_log")
      .update({
        status: "failed",
        sync_completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq("id", syncLog.id);

    return NextResponse.json<SyncResult>({
      success: false,
      students_added: studentsAdded,
      students_updated: studentsUpdated,
      students_deleted: studentsDeleted,
      errors: [errorMessage, ...errors],
    });
  }
}
