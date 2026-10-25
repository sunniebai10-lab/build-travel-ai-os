import { NextResponse } from "next/server";
import { generateAIMemory } from "@/lib/ai/memory";
import type { AIMemoryContext } from "@/lib/ai/types";
import { authorizeAIRequest } from "@/lib/supabase/server-ai-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authorization = await authorizeAIRequest(request);
    if (!authorization.authorized) {
      return NextResponse.json({ status: "error", error: authorization.error }, { status: authorization.status });
    }

    const body = (await request.json()) as { context?: AIMemoryContext };

    if (!body.context?.journal?.sentence || !body.context.trip?.city) {
      return NextResponse.json({ status: "error", error: "Missing memory context." }, { status: 400 });
    }

    const memory = await generateAIMemory(body.context);

    return NextResponse.json({ status: "success", memory });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "AI Memory request failed.",
      },
      { status: 500 },
    );
  }
}
