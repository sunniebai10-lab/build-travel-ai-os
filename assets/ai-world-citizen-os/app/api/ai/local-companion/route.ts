import { NextResponse } from "next/server";
import { getLocalCompanionInsight } from "@/lib/ai";
import type { AIIntent, AITask, BuildTravelContextInput } from "@/lib/ai";
import { authorizeAIRequest } from "@/lib/supabase/server-ai-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authorization = await authorizeAIRequest(request);
    if (!authorization.authorized) {
      return NextResponse.json({ status: "error", error: authorization.error }, { status: authorization.status });
    }

    const body = (await request.json()) as {
      intent?: AIIntent;
      task?: AITask;
      question?: string;
      contextInput?: BuildTravelContextInput;
    };

    if (!body.contextInput?.trip) {
      return NextResponse.json({ status: "error", error: "Missing travel context." }, { status: 400 });
    }

    const result = await getLocalCompanionInsight({
      ...body.contextInput,
      intent: body.intent,
      task: body.task,
      question: body.question,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "AI Local Companion request failed.",
      },
      { status: 500 },
    );
  }
}
