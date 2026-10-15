"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "submitting" | "success" | "warning" | "error";

export function DemoRequestForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setStatusMessage(null);
    setFieldErrors({});

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      collegeName: String(data.get("collegeName") ?? ""),
      contactName: String(data.get("contactName") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      batchSize: String(data.get("batchSize") ?? ""),
      message: String(data.get("message") ?? ""),
    };

    try {
      const res = await fetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);

      if (res.status === 400 && json?.fieldErrors) {
        setFieldErrors(json.fieldErrors);
        setStatus("error");
        setStatusMessage(json.error ?? "Please fix the fields below.");
        return;
      }

      if (!res.ok) {
        setStatus("error");
        setStatusMessage(
          json?.error ??
            "Something went wrong submitting this form. Please try again or email us directly.",
        );
        return;
      }

      if (json?.warning) {
        setStatus("warning");
        setStatusMessage(json.warning);
        form.reset();
        return;
      }

      setStatus("success");
      setStatusMessage("Thanks — we've got your request and will reach out shortly.");
      form.reset();
    } catch {
      setStatus("error");
      setStatusMessage("Network error. Please check your connection and try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-soft sm:p-10">
        <span className="eyebrow bg-primary/10 text-primary">Request received</span>
        <h3 className="mt-4 font-headline text-foreground">{statusMessage}</h3>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          We typically respond within one or two working days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="College / institution name"
          name="collegeName"
          required
          error={fieldErrors.collegeName}
          placeholder="e.g. Government College of Engineering"
        />
        <Field
          label="Your name"
          name="contactName"
          required
          error={fieldErrors.contactName}
          placeholder="Placement officer / TPO name"
        />
        <Field
          label="Work email"
          name="email"
          type="email"
          required
          error={fieldErrors.email}
          placeholder="you@college.edu.in"
        />
        <Field
          label="Phone number"
          name="phone"
          type="tel"
          required
          error={fieldErrors.phone}
          placeholder="+91 9XXXXXXXXX"
        />
        <Field
          label="Batch / college size (optional)"
          name="batchSize"
          error={fieldErrors.batchSize}
          placeholder="e.g. ~600 final-year students"
        />
      </div>

      <div className="mt-5">
        <label htmlFor="message" className="font-body text-sm font-medium text-foreground">
          Anything we should know? (optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          maxLength={4000}
          placeholder="Departments, placement season timing, specific concerns..."
          className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
        />
        {fieldErrors.message && (
          <p className="mt-1 font-body text-xs text-destructive">{fieldErrors.message}</p>
        )}
      </div>

      {status === "error" && statusMessage && (
        <p className="mt-5 rounded-2xl bg-destructive/10 px-4 py-3 font-body text-sm text-destructive">
          {statusMessage}
        </p>
      )}
      {status === "warning" && statusMessage && (
        <p className="mt-5 rounded-2xl bg-accent/10 px-4 py-3 font-body text-sm text-foreground">
          {statusMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="btn-primary mt-6 w-full disabled:opacity-60"
      >
        {status === "submitting" ? "Sending..." : "Request a demo"}
      </button>
      <p className="mt-3 text-center font-body text-xs text-muted-foreground">
        We&apos;ll never share your details. See our{" "}
        <a href="/privacy" className="underline">
          privacy policy
        </a>
        .
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  error,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="font-body text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-accent"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-input bg-background px-4 py-3 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
      />
      {error && <p className="mt-1 font-body text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default DemoRequestForm;
