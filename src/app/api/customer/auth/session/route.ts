import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/modules/auth/customer-session";
import { publicCustomer } from "@/modules/auth/customer-service";

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, customer: publicCustomer(customer) });
}
