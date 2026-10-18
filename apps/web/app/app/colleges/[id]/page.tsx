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
    <div className="max-w-5xl">
      <Link href="/app/colleges" className="font-body text-sm text-muted-foreground hover:text-foreground">
        ← All colleges
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-foreground">{typedCollege.name}</h1>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-headline text-lg text-foreground">College details</h2>
        <form action={updateCollege} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={typedCollege.id} />
          <TextField label="Name" name="name" defaultValue={typedCollege.name} required />
          <TextField label="Slug" name="slug" defaultValue={typedCollege.slug} />
          <TextField label="City" name="city" defaultValue={typedCollege.city ?? ""} />
          <TextField label="State" name="state" defaultValue={typedCollege.state ?? ""} />
          <TextField label="Website URL" name="website_url" type="url" defaultValue={typedCollege.website_url ?? ""} />
          <TextField label="Logo URL" name="logo_url" type="url" defaultValue={typedCollege.logo_url ?? ""} />
          <label className="flex items-center gap-2 font-body text-sm text-foreground sm:col-span-2">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={typedCollege.is_active}
              className="h-4 w-4 rounded border-border"
            />
            Active
          </label>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button type="submit" className="btn-primary">
              Save changes
            </button>
          </div>
        </form>

        <form action={deleteCollege} className="mt-4 border-t border-border pt-4">
          <input type="hidden" name="id" value={typedCollege.id} />
          <p className="font-body text-xs text-muted-foreground">
            Deleting a college also deletes its batches and un-links any students (their account
            stays, but college_id is cleared).
          </p>
          <button type="submit" className="btn-secondary mt-3 text-destructive">
            Delete college
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-headline text-lg text-foreground">Batches</h2>

        {batchesError ? (
          <p className="mt-3 font-body text-sm text-destructive">Couldn&apos;t load batches: {batchesError.message}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left font-body text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-label text-muted-foreground">
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Department</th>
                  <th className="py-2 font-medium">Grad. year</th>
                  <th className="py-2 font-medium">Active</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {((batches as Batch[]) ?? []).map((batch) => (
                  <tr key={batch.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4">
                      <form action={updateBatch} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={batch.id} />
                        <input type="hidden" name="college_id" value={typedCollege.id} />
                        <input
                          name="name"
                          defaultValue={batch.name}
                          required
                          className="w-36 rounded-xl border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                        />
                        <input
                          name="department"
                          defaultValue={batch.department ?? ""}
                          placeholder="Dept."
                          className="w-28 rounded-xl border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                        />
                        <input
                          name="graduation_year"
                          type="number"
                          defaultValue={batch.graduation_year}
                          required
                          className="w-24 rounded-xl border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                        />
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            name="is_active"
                            defaultChecked={batch.is_active}
                            className="h-3.5 w-3.5 rounded border-border"
                          />
                          Active
                        </label>
                        <button type="submit" className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="py-3" colSpan={3} />
                    <td className="py-3 text-right">
                      <form action={deleteBatch}>
                        <input type="hidden" name="id" value={batch.id} />
                        <input type="hidden" name="college_id" value={typedCollege.id} />
                        <button type="submit" className="font-body text-xs text-destructive hover:underline">
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {(!batches || batches.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      No batches yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <form action={createBatch} className="mt-5 flex flex-wrap items-end gap-2 border-t border-border pt-5">
          <input type="hidden" name="college_id" value={typedCollege.id} />
          <div>
            <label className="block font-body text-xs text-muted-foreground">Name</label>
            <input
              name="name"
              required
              placeholder="2026 B.Tech CSE"
              className="mt-1 w-48 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block font-body text-xs text-muted-foreground">Department</label>
            <input
              name="department"
              placeholder="CSE"
              className="mt-1 w-32 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block font-body text-xs text-muted-foreground">Grad. year</label>
            <input
              name="graduation_year"
              type="number"
              required
              defaultValue={new Date().getFullYear() + 1}
              className="mt-1 w-24 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <label className="flex items-center gap-1.5 pb-2.5 font-body text-xs text-muted-foreground">
            <input type="checkbox" name="is_active" defaultChecked className="h-3.5 w-3.5 rounded border-border" />
            Active
          </label>
          <button type="submit" className="btn-primary">
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
      <label htmlFor={name} className="font-body text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
      />
    </div>
  );
}
