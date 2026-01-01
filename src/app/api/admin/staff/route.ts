import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { hashPin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { name, pin } = await request.json();

    if (!name || !pin) {
      return NextResponse.json(
        { success: false, error: "Name and PIN are required" },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: "PIN must be exactly 6 digits" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Hash the PIN
    const pin_hash = await hashPin(pin);

    // Insert new staff member
    const { data, error } = await supabase
      .from("staff")
      .insert({ name, pin_hash, is_active: true })
      .select("id, name")
      .single();

    if (error) {
      console.error("Error creating staff:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create staff member" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, staff: data });
  } catch (error) {
    console.error("Staff creation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Toggle staff active status
export async function PATCH(request: NextRequest) {
  try {
    const { id, is_active } = await request.json();

    if (!id || typeof is_active !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from("staff")
      .update({ is_active })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: "Failed to update staff" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
