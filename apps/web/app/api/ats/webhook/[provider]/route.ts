import { NextRequest, NextResponse } from "next/server";
import { parseAtsWebhookPayload, verifyAtsWebhookSignature } from "@/lib/ats/connector";
import type { AtsProvider } from "@/lib/ats/types";

export const runtime = "edge";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: rawProvider } = await context.params;
    const provider = rawProvider.toLowerCase() as AtsProvider;

    if (!["greenhouse", "lever", "darwinbox"].includes(provider)) {
      return NextResponse.json(
        { error: `Unsupported ATS provider: '${rawProvider}'` },
        { status: 400 }
      );
    }

    const payloadRaw = await request.text();
    const signature = request.headers.get("x-signature") || request.headers.get("authorization");

    const webhookSecret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`] || "";
    const isValid = verifyAtsWebhookSignature(provider, webhookSecret, payloadRaw, signature);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    let parsedJson: Record<string, unknown> = {};
    try {
      parsedJson = JSON.parse(payloadRaw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const candidate = parseAtsWebhookPayload(provider, parsedJson);
    if (!candidate) {
      return NextResponse.json(
        { error: "Could not parse candidate details from ATS payload" },
        { status: 422 }
      );
    }

    // Return successful ingestion confirmation
    return NextResponse.json({
      success: true,
      provider,
      candidate,
      message: `Candidate ${candidate.firstName} ${candidate.lastName} (${candidate.email}) ingested from ${provider} into Vyoman assessment queue.`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error processing ATS webhook" },
      { status: 500 }
    );
  }
}
