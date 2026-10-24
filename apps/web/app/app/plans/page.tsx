import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth/current-profile";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import type { Plan } from "@/lib/types/db";
import { createPlan, deletePlan, updatePlan } from "./actions";

export const metadata: Metadata = {
  title: "Plans",
};

export const dynamic = "force-dynamic";

function formatRupees(paise: number): string {
  return (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default async function PlansPage() {
  requireRole(await getCurrentProfile(), ["platform_admin"]);

  const supabase = await createClient();
  const { data: plans, error } = await supabase
    .from("plans")
    .select("*")
    .order("audience", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
          Subscription Plans
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Student and college institutional tier packages, pricing structures, and feature quotas.
        </p>
      </div>

      {/* Add Plan Expandable Panel */}
      <details className="rounded-lg border border-border/80 bg-card open:pb-5">
        <summary className="cursor-pointer list-none px-5 py-3.5 font-body text-xs font-medium text-foreground hover:bg-muted/40">
          + Create a new plan
        </summary>
        <form action={createPlan} className="grid gap-3 px-5 pt-2 sm:grid-cols-3">
          <Field label="Plan name *" name="name" required placeholder="Student — Annual Pass" />
          <SelectField label="Target audience" name="audience" options={["student", "college"]} />
          <SelectField label="Billing period" name="billing_period" options={["yearly", "monthly"]} />
          <Field label="Price (INR) *" name="price_rupees" type="number" required placeholder="999" />
          <Field label="Interview quota" name="interview_quota_per_period" type="number" placeholder="20" />
          <Field label="Resume scan quota" name="resume_scan_quota_per_period" type="number" placeholder="10" />
          <Field label="Chat message quota" name="chat_message_quota_per_period" type="number" placeholder="100" />
          <label className="flex items-center gap-2 pt-6 font-body text-xs text-foreground">
            <input type="checkbox" name="is_active" defaultChecked className="h-3.5 w-3.5 rounded border-border" />
            Active tier
          </label>
          <div className="flex items-end sm:col-span-3 pt-1">
            <button
              type="submit"
              className="inline-flex h-8 items-center rounded bg-foreground px-3.5 font-body text-xs font-medium text-background hover:bg-foreground/90"
            >
              Create plan
            </button>
          </div>
        </form>
      </details>

      {/* Plans Table */}
      <div className="overflow-x-auto rounded-lg border border-border/80 bg-card">
        {error ? (
          <p className="p-5 font-body text-xs text-destructive">Couldn&apos;t load plans: {error.message}</p>
        ) : !plans || plans.length === 0 ? (
          <p className="p-8 text-center font-body text-xs text-muted-foreground">No plans configured yet. Create one above.</p>
        ) : (
          <table className="w-full text-left font-body text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Plan</th>
                <th className="px-4 py-2.5 font-medium">Audience</th>
                <th className="px-4 py-2.5 font-medium">Price</th>
                <th className="px-4 py-2.5 font-medium">Quotas (Interviews / Scans / Chat)</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {(plans as Plan[]).map((plan) => (
                <tr key={plan.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30 align-top">
                  <td className="px-5 py-3">
                    <p className="font-medium text-foreground">{plan.name}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{plan.billing_period}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{plan.audience}</td>
                  <td className="px-4 py-3 font-metric font-medium text-foreground tabular-nums">
                    ₹{formatRupees(plan.price_paise)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {plan.interview_quota_per_period ?? "∞"} / {plan.resume_scan_quota_per_period ?? "∞"} /{" "}
                    {plan.chat_message_quota_per_period ?? "∞"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        plan.is_active
                          ? "inline-flex rounded border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-900 leading-none dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "inline-flex rounded border border-border/80 bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground leading-none"
                      }
                    >
                      {plan.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <details>
                      <summary className="cursor-pointer list-none font-medium text-foreground underline-offset-4 hover:underline">
                        Edit
                      </summary>
                      <form action={updatePlan} className="mt-3 grid gap-2 sm:grid-cols-2 text-left">
                        <input type="hidden" name="id" value={plan.id} />
                        <Field label="Name" name="name" defaultValue={plan.name} required />
                        <SelectField label="Audience" name="audience" options={["student", "college"]} defaultValue={plan.audience} />
                        <SelectField
                          label="Billing period"
                          name="billing_period"
                          options={["yearly", "monthly"]}
                          defaultValue={plan.billing_period}
                        />
                        <Field
                          label="Price (INR)"
                          name="price_rupees"
                          type="number"
                          defaultValue={String(plan.price_paise / 100)}
                          required
                        />
                        <Field
                          label="Interview quota"
                          name="interview_quota_per_period"
                          type="number"
                          defaultValue={plan.interview_quota_per_period?.toString() ?? ""}
                        />
                        <Field
                          label="Resume scan quota"
                          name="resume_scan_quota_per_period"
                          type="number"
                          defaultValue={plan.resume_scan_quota_per_period?.toString() ?? ""}
                        />
                        <label className="flex items-center gap-2 pt-2 font-body text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            name="is_active"
                            defaultChecked={plan.is_active}
                            className="h-3.5 w-3.5 rounded border-border"
                          />
                          Active
                        </label>
                        <div className="sm:col-span-2 pt-1 flex items-center justify-between">
                          <button
                            type="submit"
                            className="inline-flex h-7 items-center rounded bg-foreground px-3 font-body text-xs font-medium text-background hover:bg-foreground/90"
                          >
                            Save changes
                          </button>
                        </div>
                      </form>
                      <form action={deletePlan} className="mt-2 text-left">
                        <input type="hidden" name="id" value={plan.id} />
                        <button type="submit" className="font-body text-[11px] text-rose-700 hover:underline dark:text-rose-400">
                          Delete plan
                        </button>
                      </form>
                    </details>
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

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block font-body text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-1 h-7 w-full rounded border border-border/80 bg-background px-2 font-body text-xs text-foreground outline-none focus:border-foreground/40 placeholder:text-muted-foreground/60"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block font-body text-[11px] font-medium text-muted-foreground">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? options[0]}
        className="mt-1 h-7 w-full rounded border border-border/80 bg-background px-2 font-body text-xs capitalize text-foreground outline-none focus:border-foreground/40"
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="capitalize">
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
