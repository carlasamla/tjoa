import { NextResponse } from "next/server";
import { analytics } from "@/app/lib/analytics";

export async function GET() {
  const data = await analytics.getDashboardData();
  return NextResponse.json(data);
}
