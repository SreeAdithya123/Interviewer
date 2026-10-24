import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import type { Batch, College } from "@/lib/types/db";
import { createBatch, deleteBatch, deleteCollege, updateBatch, updateCollege } from "../actions";

export const metadata: Metadata = {
  title: "College detail",
};

export const dynamic = "force-dynamic";

export default async function CollegeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  requireRole(await getCurrentProfile(), ["platform_admin"]);
  const { id } = await params;

  const supabase = await createClient();
  const [{ data: college, error: collegeError }, { data: batches, error: batchesError }] = await Promise.all([
    supabase.from("colleges").select("*").eq("id", id).maybeSingle(),
    supabase.from("batches").select("*").eq("college_id", id).order("graduation_year", { ascending: false }),
  ]);

  if (collegeError) {
    throw new Error(collegeError.message);
  }
  if (!college) {
    notFound();
  }

  const typedCollege = college as College;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/app/colleges" className="font-body text-xs text-muted-foreground hover:text-foreground">
          ← Back to colleges
        </Link>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
          {typedCollege.name}
        </h1>
        <p className="font-body text-xs text-muted-foreground">
          Institutional profile and batch configuration
        </p>
      </div>

      {/* College Settings Form */}
      <section className="rounded-lg border border-border/80 bg-card p-5">
        <h2 className="font-body text-sm font-semibold text-foreground">College details</h2>
        <form action={updateCollege} className="mt-4 grid gap-3.5 sm:grid-cols-2">
          <input type="hidden" name="id" value={typedCollege.id} />
          <TextField label="Name *" name="name" defaultValue={typedCollege.name} required />
          <TextField label="Slug" name="slug" defaultValue={typedCollege.slug} />
          <TextField label="City" name="city" defaultValue={typedCollege.city ?? ""} />
          <TextField label="State" name="state" defaultValue={typedCollege.state ?? ""} />
          <TextField label="Website URL" name="website_url" type="url" defaultValue={typedCollege.website_url ?? ""} />
          <TextField label="Logo URL" name="logo_url" type="url" defaultValue={typedCollege.logo_url ?? ""} />
          <label className="flex items-center gap-2 font-body text-xs text-foreground sm:col-span-2">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={typedCollege.is_active}
              className="h-3.5 w-3.5 rounded border-border"
            />
            Active institution
          </label>
          <div className="flex items-center gap-3 sm:col-span-2 pt-1">
            <button
              type="submit"
              className="inline-flex h-8 items-center rounded bg-foreground px-3.5 font-body text-xs font-medium text-background hover:bg-foreground/90"
            >
              Save changes
            </button>
          </div>
        </form>

        <form action={deleteCollege} className="mt-5 border-t border-border/60 pt-4">
          <input type="hidden" name="id" value={typedCollege.id} />
          <p className="font-body text-[11px] text-muted-foreground">
            Deleting a college deletes its batches and clears student college associations.
          </p>
          <button
            type="submit"
            className="mt-2 inline-flex h-7 items-center rounded border border-rose-200 bg-rose-50 px-2.5 font-body text-[11px] font-medium text-rose-800 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
          >
            Delete college
          </button>
        </form>
      </section>

      {/* Batches Table & Inline Form */}
      <section className="rounded-lg border border-border/80 bg-card p-5">
        <h2 className="font-body text-sm font-semibold text-foreground">Academic batches</h2>
        <p className="font-body text-xs text-muted-foreground">Class cohorts enrolled at this institution</p>

        {batchesError ? (
          <p className="mt-3 font-body text-xs text-destructive">Couldn&apos;t load batches: {batchesError.message}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left font-body text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="py-2.5 font-medium">Batch configuration</th>
                  <th className="py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {((batches as Batch[]) ?? []).map((batch) => (
                  <tr key={batch.id}>
                    <td className="py-2.5 pr-4">
                      <form action={updateBatch} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={batch.id} />
                        <input type="hidden" name="college_id" value={typedCollege.id} />
                        <input
                          name="name"
                          defaultValue={batch.name}
                          required
                          className="h-7 w-36 rounded border border-border/80 bg-background px-2 font-body text-xs text-foreground outline-none focus:border-foreground/40"
                        />
                        <input
                          name="department"
                          defaultValue={batch.department ?? ""}
                          placeholder="Dept."
                          className="h-7 w-28 rounded border border-border/80 bg-background px-2 font-body text-xs text-foreground outline-none focus:border-foreground/40"
                        />
                        <input
                          name="graduation_year"
                          type="number"
                          defaultValue={batch.graduation_year}
                          required
                          className="h-7 w-20 rounded border border-border/80 bg-background px-2 font-body text-xs text-foreground outline-none focus:border-foreground/40"
                        />
                        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <input
                            type="checkbox"
                            name="is_active"
                            defaultChecked={batch.is_active}
                            className="h-3 w-3 rounded border-border"
                          />
                          Active
                        </label>
                        <button
                          type="submit"
                          className="inline-flex h-7 items-center rounded border border-border/80 bg-background px-2.5 font-body text-[11px] font-medium text-foreground hover:bg-muted"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="py-2.5 text-right">
                      <form action={deleteBatch}>
                        <input type="hidden" name="id" value={batch.id} />
                        <input type="hidden" name="college_id" value={typedCollege.id} />
                        <button type="submit" className="font-body text-[11px] text-rose-700 hover:underline dark:text-rose-400">
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {(!batches || batches.length === 0) && (
                  <tr>
                    <td colSpan={2} className="py-6 text-center text-muted-foreground">
                      No batches added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <form action={createBatch} className="mt-4 flex flex-wrap items-end gap-2 border-t border-border/60 pt-4">
          <input type="hidden" name="college_id" value={typedCollege.id} />
          <div>
            <label className="block font-body text-[11px] text-muted-foreground">Batch name *</label>
            <input
              name="name"
              required
              placeholder="2026 B.Tech CSE"
              className="mt-1 h-7 w-44 rounded border border-border/80 bg-background px-2 font-body text-xs text-foreground outline-none focus:border-foreground/40"
            />
          </div>
          <div>
            <label className="block font-body text-[11px] text-muted-foreground">Department</label>
            <input
              name="department"
              placeholder="CSE"
              className="mt-1 h-7 w-28 rounded border border-border/80 bg-background px-2 font-body text-xs text-foreground outline-none focus:border-foreground/40"
            />
          </div>
          <div>
            <label className="block font-body text-[11px] text-muted-foreground">Grad. year *</label>
            <input
              name="graduation_year"
              type="number"
              required
              defaultValue={new Date().getFullYear() + 1}
              className="mt-1 h-7 w-20 rounded border border-border/80 bg-background px-2 font-body text-xs text-foreground outline-none focus:border-foreground/40"
            />
          </div>
          <label className="flex items-center gap-1 pb-1.5 font-body text-[11px] text-muted-foreground">
            <input type="checkbox" name="is_active" defaultChecked className="h-3 w-3 rounded border-border" />
            Active
          </label>
          <button
            type="submit"
            className="inline-flex h-7 items-center rounded bg-foreground px-3 font-body text-xs font-medium text-background hover:bg-foreground/90"
          >
            Add batch
          </button>
        </form>
      </section>
    </div>
  );
}

function TextField({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        className="mt-1 h-8 w-full rounded border border-border/80 bg-background px-3 font-body text-xs text-foreground outline-none focus:border-foreground/40"
      />
    </div>
  );
}
