import { NextResponse } from "next/server";
import { REGISTRIES, syncRegistry } from "@/lib/registry-sync";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const activeRegistries = REGISTRIES.filter((r) => r.enabled);

    const results = await Promise.all(
      activeRegistries.map((registry) => syncRegistry(registry))
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("Failed to get registry status:", error);
    return NextResponse.json(
      { error: "Failed to fetch registry status" },
      { status: 500 }
    );
  }
}
