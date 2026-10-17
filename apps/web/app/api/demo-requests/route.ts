import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// POST /api/demo-requests
//
// Backs the /book-a-demo form (docs/BUILD_SPEC.md Part 4.9 + Part 5:
// `demo_requests` table). Validates input, then:
//   1. inserts a row into Supabase `demo_requests`
//   2. emails the founder a notification via Resend
// Both external calls are wrapped in try/catch. There are no real Supabase
// or Resend credentials in this environment, so both are EXPECTED to fail
// right now — that failure is surfaced to the client as a real error rather
// than a fabricated success response. The code path itself is real and
// correctly wired; it will start working the moment real env vars land.

export const dynamic = "force-dynamic";

interface DemoRequestPayload {
  collegeName: string;
  contactName: string;
  email: string;
  phone: string;
  batchSize?: string;
  message?: string;
}

interface ValidationResult {
  ok: boolean;
  errors: Record<string, string>;
  value: DemoRequestPayload;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(body: unknown): ValidationResult {
  const errors: Record<string, string> = {};
  const b = (body ?? {}) as Record<string, unknown>;

  const str = (key: string) => (typeof b[key] === "string" ? (b[key] as string).trim() : "");

  const collegeName = str("collegeName");
  const contactName = str("contactName");
  const email = str("email");
  const phone = str("phone");
  const batchSize = str("batchSize");
  const message = str("message");

  if (!collegeName) errors.collegeName = "College name is required.";
  else if (collegeName.length > 200) errors.collegeName = "College name is too long.";

  if (!contactName) errors.contactName = "Contact name is required.";
  else if (contactName.length > 200) errors.contactName = "Contact name is too long.";

  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(email) || email.length > 320) errors.email = "Enter a valid email address.";

  if (!phone) errors.phone = "Phone number is required.";
  else if (phone.length > 40) errors.phone = "Phone number is too long.";

  if (batchSize.length > 100) errors.batchSize = "Batch size is too long.";
  if (message.length > 4000) errors.message = "Message is too long (max 4000 characters).";

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { collegeName, contactName, email, phone, batchSize, message },
  };
}

async function insertDemoRequest(value: DemoRequestPayload) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // The anon/publishable key is enough here: demo_requests has an explicit
  // RLS policy allowing `anon` to insert (it's the public "Book a Demo"
  // form), so this route doesn't need the more powerful service-role key.
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are missing from the environment.",
    );
  }

  const supabase = createClient(url, publishableKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("demo_requests").insert({
    college_name: value.collegeName,
    contact_name: value.contactName,
    email: value.email,
    phone: value.phone,
    batch_size: value.batchSize || null,
    message: value.message || null,
  });

  if (error) {
    throw new Error(`Supabase insert into demo_requests failed: ${error.message}`);
  }
}

async function sendNotificationEmail(value: DemoRequestPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.DEMO_REQUEST_NOTIFY_EMAIL;
  const from = process.env.DEMO_REQUEST_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    throw new Error(
      "Resend is not configured: RESEND_API_KEY, DEMO_REQUEST_NOTIFY_EMAIL and/or DEMO_REQUEST_FROM_EMAIL are missing from the environment.",
    );
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `New demo request: ${value.collegeName}`,
      text: [
        `New demo request from the Vyoman Interviewer landing site.`,
        ``,
        `College: ${value.collegeName}`,
        `Contact: ${value.contactName}`,
        `Email: ${value.email}`,
        `Phone: ${value.phone}`,
        value.batchSize ? `Batch size: ${value.batchSize}` : null,
        value.message ? `Message: ${value.message}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Resend API responded with ${res.status}: ${detail}`);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be valid JSON." }, { status: 400 });
  }

  const { ok, errors, value } = validate(body);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Validation failed.", fieldErrors: errors }, { status: 400 });
  }

  let dbError: string | null = null;
  let emailError: string | null = null;

  try {
    await insertDemoRequest(value);
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Unknown database error.";
  }

  try {
    await sendNotificationEmail(value);
  } catch (err) {
    emailError = err instanceof Error ? err.message : "Unknown email error.";
  }

  if (dbError) {
    // The row didn't get saved — this is the failure that matters to the
    // caller, regardless of whether the email also failed.
    return NextResponse.json(
      {
        ok: false,
        error: "We could not save your request. Please try again shortly or email us directly.",
        dbError,
        emailError,
      },
      { status: 502 },
    );
  }

  if (emailError) {
    // Saved, but the founder won't get a notification email yet.
    return NextResponse.json(
      {
        ok: true,
        warning: "Your request was saved, but the notification email could not be sent.",
        emailError,
      },
      { status: 207 },
    );
  }

  return NextResponse.json({ ok: true });
}
