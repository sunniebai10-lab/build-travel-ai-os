import { NextResponse } from "next/server";
import { generateAIPlannerDraft } from "@/lib/ai/planner";
import type { AIPlannerInput } from "@/lib/ai/types";
import { authorizeAIRequest } from "@/lib/supabase/server-ai-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authorization = await authorizeAIRequest(request);
    if (!authorization.authorized) {
      return NextResponse.json({ status: "error", error: authorization.error }, { status: authorization.status });
    }

    const body = (await request.json()) as { input?: AIPlannerInput };

    if (!body.input?.destination || !body.input.duration) {
      return NextResponse.json({ status: "error", error: "Missing planner input." }, { status: 400 });
    }

    const draft = await generateAIPlannerDraft(body.input);

    return NextResponse.json({ status: "success", draft });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "AI Planner request failed.",
      },
      { status: 500 },
    );
  }
}
