import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import type { College } from "@/lib/types/db";
import { createCollege } from "./actions";

export const metadata: Metadata = {
  title: "Colleges",
};

export const dynamic = "force-dynamic";

export default async function CollegesPage() {
  requireRole(await getCurrentProfile(), ["platform_admin"]);

  const supabase = await createClient();
  const { data: colleges, error } = await supabase
    .from("colleges")
    .select("*")
    .order("name", { ascending: true });

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Colleges</h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Every college on the platform. Open one to manage its batches.
          </p>
        </div>
      </div>

      <details className="mt-6 rounded-3xl border border-border bg-card open:pb-6">
        <summary className="cursor-pointer list-none px-6 py-4 font-body text-sm font-medium text-primary">
          + Add a college
        </summary>
        <form action={createCollege} className="grid gap-4 px-6 sm:grid-cols-2">
          <TextField label="Name" name="name" required placeholder="e.g. IIT Bombay" />
          <TextField label="Slug (optional — derived from name)" name="slug" placeholder="iit-bombay" />
          <TextField label="City" name="city" />
          <TextField label="State" name="state" />
          <TextField label="Website URL" name="website_url" type="url" />
          <TextField label="Logo URL" name="logo_url" type="url" />
          <label className="flex items-center gap-2 font-body text-sm text-foreground sm:col-span-2">
            <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4 rounded border-border" />
            Active
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              Create college
            </button>
          </div>
        </form>
      </details>

      <div className="mt-6 overflow-x-auto rounded-3xl border border-border bg-card">
        {error ? (
          <p className="p-6 font-body text-sm text-destructive">Couldn&apos;t load colleges: {error.message}</p>
        ) : !colleges || colleges.length === 0 ? (
          <p className="p-6 font-body text-sm text-muted-foreground">
            No colleges yet. Add the first one above.
          </p>
        ) : (
          <table className="w-full text-left font-body text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-label text-muted-foreground">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Location</th>
                <th className="px-6 py-3 font-medium">Slug</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(colleges as College[]).map((college) => (
                <tr key={college.id} className="border-b border-border last:border-0">
                  <td className="px-6 py-4 text-foreground">{college.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {[college.city, college.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{college.slug}</td>
                  <td className="px-6 py-4">
                    <span
                      className={
                        college.is_active
                          ? "inline-flex rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-medium text-secondary"
                          : "inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {college.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/app/colleges/${college.id}`} className="font-medium text-primary hover:underline">
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TextField({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="font-body text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
      />
    </div>
  );
}
