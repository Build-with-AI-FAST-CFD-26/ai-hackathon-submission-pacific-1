import { NextResponse } from "next/server";
import { z } from "zod";
import { answerWorkspaceQuestion } from "@/lib/rag";

const chatSchema = z.object({
  message: z.string().trim().min(1, "Message is required."),
  workspaceId: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = chatSchema.parse(body);
    const response = await answerWorkspaceQuestion(payload.message, payload.workspaceId);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Chat route failed", error);
    return NextResponse.json(
      { error: "Sync could not answer that question right now." },
      { status: 500 },
    );
  }
}
