"use client";

// Shared error boundary for everything under /app (including a thrown
// Server Action — e.g. a Supabase constraint violation like a duplicate
// college slug, or the explicit "Only a platform admin can do this"
// checks every mutation in this tree re-asserts). Next.js renders this in
// place of the segment that threw; `reset()` re-renders it without a full
// navigation, which is enough for "fix the form and submit again".
export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-lg rounded-3xl border border-border bg-card p-8">
      <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
      <p className="mt-2 font-body text-sm text-muted-foreground">
        {error.message || "That action couldn't be completed. Please try again."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="btn-primary mt-6"
      >
        Try again
      </button>
    </div>
  );
}
