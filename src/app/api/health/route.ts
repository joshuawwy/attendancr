import { NextResponse } from "next/server";

export async function HEAD() {
  return NextResponse.json({ status: "ok" });
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
}
