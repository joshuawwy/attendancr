import { NextRequest, NextResponse } from "next/server";
import { authenticateStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();

    if (!pin || typeof pin !== "string" || pin.length !== 6) {
      return NextResponse.json(
        { success: false, error: "Invalid PIN format" },
        { status: 400 }
      );
    }

    const result = await authenticateStaff(pin);

    if (result.success && result.staff) {
      return NextResponse.json({
        success: true,
        staff: result.staff,
      });
    }

    return NextResponse.json(
      { success: false, error: result.error || "Authentication failed" },
      { status: 401 }
    );
  } catch (error) {
    console.error("Staff auth error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
