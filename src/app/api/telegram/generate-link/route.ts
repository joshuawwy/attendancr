import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { generateLinkCode } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { parent_id } = await request.json();

    if (!parent_id) {
      return NextResponse.json(
        { success: false, error: "Parent ID is required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Verify parent exists
    const { data: parent, error: parentError } = await supabase
      .from("parents")
      .select("id")
      .eq("id", parent_id)
      .single();

    if (parentError || !parent) {
      return NextResponse.json(
        { success: false, error: "Parent not found" },
        { status: 404 }
      );
    }

    // Generate unique code
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = generateLinkCode();
      const { data: existing } = await supabase
        .from("telegram_link_codes")
        .select("code")
        .eq("code", code)
        .eq("used", false)
        .single();

      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { success: false, error: "Failed to generate unique code" },
        { status: 500 }
      );
    }

    // Set expiration to 24 hours from now
    const expires_at = new Date();
    expires_at.setHours(expires_at.getHours() + 24);

    // Insert link code
    const { error: insertError } = await supabase
      .from("telegram_link_codes")
      .insert({
        code,
        parent_id,
        expires_at: expires_at.toISOString(),
        used: false,
      });

    if (insertError) {
      console.error("Error creating link code:", insertError);
      return NextResponse.json(
        { success: false, error: "Failed to create link code" },
        { status: 500 }
      );
    }

    // Get bot username from environment or default
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "attendancr_bot";
    const link = `https://t.me/${botUsername}?start=${code}`;

    return NextResponse.json({ success: true, link, code });
  } catch (error) {
    console.error("Generate link error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
