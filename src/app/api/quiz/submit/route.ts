import { NextResponse } from "next/server";
import { QuizService, SubmitQuizInput } from "@/core/services/quiz.service";
import { LocalStorageAdapter } from "@/adapters/storage/local-storage.adapter";
import { LocalLoggerAdapter } from "@/adapters/logger/local-logger.adapter";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubmitQuizInput;

    if (!body.paperId || !Array.isArray(body.userResponses)) {
      return NextResponse.json(
        { success: false, error: "Invalid payload: paperId and userResponses array are required." },
        { status: 400 }
      );
    }

    const storage = new LocalStorageAdapter("./local_storage");
    const logger = new LocalLoggerAdapter("./local_storage");
    const quizService = new QuizService(storage, logger);

    const attemptResult = await quizService.evaluateAndRecordAttempt(body);

    return NextResponse.json({
      success: true,
      attempt: attemptResult,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to evaluate and save quiz" },
      { status: 500 }
    );
  }
}
