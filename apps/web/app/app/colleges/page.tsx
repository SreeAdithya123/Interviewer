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
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
            Colleges
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Institutions onboarded to the platform. Manage campus batches and institutional quotas.
          </p>
        </div>
      </div>

      {/* Add College Form Panel */}
      <details className="rounded-lg border border-border/80 bg-card open:pb-5">
        <summary className="cursor-pointer list-none px-5 py-3.5 font-body text-xs font-medium text-foreground hover:bg-muted/40">
          + Onboard a new college
        </summary>
        <form action={createCollege} className="grid gap-3.5 px-5 pt-2 sm:grid-cols-2">
          <TextField label="College name *" name="name" required placeholder="e.g. SASI Institute of Technology" />
          <TextField label="Slug (optional)" name="slug" placeholder="sasi-institute" />
          <TextField label="City" name="city" placeholder="Tadepalligudem" />
          <TextField label="State" name="state" placeholder="Andhra Pradesh" />
          <TextField label="Website URL" name="website_url" type="url" placeholder="https://sasi.ac.in" />
          <TextField label="Logo URL" name="logo_url" type="url" placeholder="https://..." />
          <label className="flex items-center gap-2 font-body text-xs text-foreground sm:col-span-2">
            <input type="checkbox" name="is_active" defaultChecked className="h-3.5 w-3.5 rounded border-border" />
            Active institution
          </label>
          <div className="sm:col-span-2 pt-1">
            <button
              type="submit"
              className="inline-flex h-8 items-center rounded bg-foreground px-3.5 font-body text-xs font-medium text-background hover:bg-foreground/90"
            >
              Create college
            </button>
          </div>
        </form>
      </details>

      {/* Colleges Table */}
      <div className="overflow-x-auto rounded-lg border border-border/80 bg-card">
        {error ? (
          <p className="p-5 font-body text-xs text-destructive">Couldn&apos;t load colleges: {error.message}</p>
        ) : !colleges || colleges.length === 0 ? (
          <p className="p-8 text-center font-body text-xs text-muted-foreground">
            No partner colleges yet. Add the first one above.
          </p>
        ) : (
          <table className="w-full text-left font-body text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Institution</th>
                <th className="px-4 py-2.5 font-medium">Location</th>
                <th className="px-4 py-2.5 font-medium">Slug</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {(colleges as College[]).map((college) => (
                <tr
                  key={college.id}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="px-5 py-3 font-medium text-foreground">{college.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {[college.city, college.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{college.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        college.is_active
                          ? "inline-flex rounded border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-900 leading-none dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40"
                          : "inline-flex rounded border border-border/80 bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground leading-none"
                      }
                    >
                      {college.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/app/colleges/${college.id}`}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
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
      <label htmlFor={name} className="block font-body text-xs font-medium text-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40 placeholder:text-muted-foreground/60"
      />
    </div>
  );
}
