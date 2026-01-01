import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { sendTelegramMessage, formatCheckInNotification } from "@/lib/telegram";
import { formatSGT } from "@/lib/utils";
import { CheckInRequest, CheckInResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body: CheckInRequest = await request.json();
    const { student_id, staff_id, check_in_time } = body;

    if (!student_id || !staff_id || !check_in_time) {
      return NextResponse.json<CheckInResponse>(
        { success: false, notification_sent: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Auto check-out previous session if student is already checked in
    const { data: existingAttendance } = await supabase
      .from("attendance")
      .select("id")
      .eq("student_id", student_id)
      .is("check_out_time", null)
      .order("check_in_time", { ascending: false })
      .limit(1);

    if (existingAttendance && existingAttendance.length > 0) {
      await supabase
        .from("attendance")
        .update({ check_out_time: check_in_time })
        .eq("id", existingAttendance[0].id);
    }

    // Create new attendance record
    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance")
      .insert({
        student_id,
        check_in_time,
        checked_in_by: staff_id,
      })
      .select("id")
      .single();

    if (attendanceError || !attendance) {
      console.error("Attendance insert error:", attendanceError);
      return NextResponse.json<CheckInResponse>(
        { success: false, notification_sent: false, error: "Failed to record attendance" },
        { status: 500 }
      );
    }

    // Get student details with parent info
    const { data: student } = await supabase
      .from("students")
      .select(`
        name,
        primary_parent_id,
        secondary_parent_id
      `)
      .eq("id", student_id)
      .single();

    if (!student) {
      return NextResponse.json<CheckInResponse>({
        success: true,
        attendance_id: attendance.id,
        notification_sent: false,
        notification_errors: ["Student not found for notification"],
      });
    }

    // Collect parent IDs to notify
    const parentIds: string[] = [];
    if (student.primary_parent_id) parentIds.push(student.primary_parent_id);
    if (student.secondary_parent_id) parentIds.push(student.secondary_parent_id);

    if (parentIds.length === 0) {
      return NextResponse.json<CheckInResponse>({
        success: true,
        attendance_id: attendance.id,
        notification_sent: false,
        notification_errors: ["No parents linked to student"],
      });
    }

    // Get parent telegram_chat_ids
    const { data: parents } = await supabase
      .from("parents")
      .select("id, telegram_chat_id")
      .in("id", parentIds);

    if (!parents || parents.length === 0) {
      return NextResponse.json<CheckInResponse>({
        success: true,
        attendance_id: attendance.id,
        notification_sent: false,
        notification_errors: ["No parent records found"],
      });
    }

    // Send notifications to parents with telegram_chat_id
    const notificationErrors: string[] = [];
    let notificationSent = false;
    const checkInTimeFormatted = formatSGT(check_in_time);
    const message = formatCheckInNotification(student.name, "ABC Centre", checkInTimeFormatted);

    for (const parent of parents) {
      if (!parent.telegram_chat_id) {
        // Log failed notification - parent hasn't linked Telegram
        await supabase.from("failed_notifications").insert({
          student_id,
          parent_id: parent.id,
          error_message: "Parent has not linked Telegram account",
        });
        continue;
      }

      const result = await sendTelegramMessage(parent.telegram_chat_id, message);

      if (result.success) {
        notificationSent = true;
      } else {
        notificationErrors.push(result.error || "Unknown error");
        // Log failed notification
        await supabase.from("failed_notifications").insert({
          student_id,
          parent_id: parent.id,
          error_message: result.error,
        });
      }
    }

    return NextResponse.json<CheckInResponse>({
      success: true,
      attendance_id: attendance.id,
      notification_sent: notificationSent,
      notification_errors: notificationErrors.length > 0 ? notificationErrors : undefined,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json<CheckInResponse>(
      { success: false, notification_sent: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
