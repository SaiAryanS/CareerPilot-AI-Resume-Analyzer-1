// src/app/api/parse-resume/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // important

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (
      file.type &&
      file.type !== "application/pdf" &&
      !file.name?.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json({ error: "File is not a PDF." }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());

    // <-- no deep path, no createRequire
    const pdfParse = (await import("pdf-parse-fixed")).default as (
      b: Buffer
    ) => Promise<{ text?: string }>;

    const { text = "" } = await pdfParse(buf);
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Error parsing PDF:", error);
    return NextResponse.json(
      { error: "Failed to parse PDF.", detail: String(error?.message ?? error) },
      { status: 500 }
    );
  }
}
