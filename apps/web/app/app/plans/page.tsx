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
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-foreground">Plans</h1>
      <p className="mt-1 font-body text-sm text-muted-foreground">
        Student and college pricing plans and their quotas. Prices are placeholders until real
        pricing is set (docs/BUILD_SPEC.md Part 4.9).
      </p>

      <details className="mt-6 rounded-3xl border border-border bg-card open:pb-6">
        <summary className="cursor-pointer list-none px-6 py-4 font-body text-sm font-medium text-primary">
          + Add a plan
        </summary>
        <form action={createPlan} className="grid gap-4 px-6 sm:grid-cols-3">
          <Field label="Name" name="name" required placeholder="Student — Yearly" />
          <SelectField label="Audience" name="audience" options={["student", "college"]} />
          <SelectField label="Billing period" name="billing_period" options={["yearly", "monthly"]} />
          <Field label="Price (INR)" name="price_rupees" type="number" required placeholder="999" />
          <Field label="Interview quota / period" name="interview_quota_per_period" type="number" />
          <Field label="Resume scan quota / period" name="resume_scan_quota_per_period" type="number" />
          <Field label="Chat message quota / period" name="chat_message_quota_per_period" type="number" />
          <label className="flex items-center gap-2 pt-6 font-body text-sm text-foreground">
            <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4 rounded border-border" />
            Active
          </label>
          <div className="flex items-end sm:col-span-3">
            <button type="submit" className="btn-primary">
              Create plan
            </button>
          </div>
        </form>
      </details>

      <div className="mt-6 overflow-x-auto rounded-3xl border border-border bg-card">
        {error ? (
          <p className="p-6 font-body text-sm text-destructive">Couldn&apos;t load plans: {error.message}</p>
        ) : !plans || plans.length === 0 ? (
          <p className="p-6 font-body text-sm text-muted-foreground">No plans yet. Add the first one above.</p>
        ) : (
          <table className="w-full text-left font-body text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-label text-muted-foreground">
                <th className="px-6 py-3 font-medium">Plan</th>
                <th className="px-6 py-3 font-medium">Audience</th>
                <th className="px-6 py-3 font-medium">Price</th>
                <th className="px-6 py-3 font-medium">Quotas (interview / scan / chat)</th>
                <th className="px-6 py-3 font-medium">Active</th>
                <th className="px-6 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(plans as Plan[]).map((plan) => (
                <tr key={plan.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-6 py-4 text-foreground">
                    {plan.name}
                    <div className="font-body text-xs text-muted-foreground">{plan.billing_period}</div>
                  </td>
                  <td className="px-6 py-4 capitalize text-muted-foreground">{plan.audience}</td>
                  <td className="px-6 py-4 font-metric text-foreground">
                    ₹{formatRupees(plan.price_paise)}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {plan.interview_quota_per_period ?? "∞"} / {plan.resume_scan_quota_per_period ?? "∞"} /{" "}
                    {plan.chat_message_quota_per_period ?? "∞"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={
                        plan.is_active
                          ? "inline-flex rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-medium text-secondary"
                          : "inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {plan.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <details>
                      <summary className="cursor-pointer list-none font-medium text-primary hover:underline">
                        Edit
                      </summary>
                      <form action={updatePlan} className="mt-3 grid gap-2 sm:grid-cols-2">
                        <input type="hidden" name="id" value={plan.id} />
                        <Field label="Name" name="name" defaultValue={plan.name} required compact />
                        <SelectField label="Audience" name="audience" options={["student", "college"]} defaultValue={plan.audience} compact />
                        <SelectField
                          label="Billing period"
                          name="billing_period"
                          options={["yearly", "monthly"]}
                          defaultValue={plan.billing_period}
                          compact
                        />
                        <Field
                          label="Price (INR)"
                          name="price_rupees"
                          type="number"
                          defaultValue={String(plan.price_paise / 100)}
                          required
                          compact
                        />
                        <Field
                          label="Interview quota"
                          name="interview_quota_per_period"
                          type="number"
                          defaultValue={plan.interview_quota_per_period?.toString() ?? ""}
                          compact
                        />
                        <Field
                          label="Resume scan quota"
                          name="resume_scan_quota_per_period"
                          type="number"
                          defaultValue={plan.resume_scan_quota_per_period?.toString() ?? ""}
                          compact
                        />
                        <Field
                          label="Chat message quota"
                          name="chat_message_quota_per_period"
                          type="number"
                          defaultValue={plan.chat_message_quota_per_period?.toString() ?? ""}
                          compact
                        />
                        <label className="flex items-center gap-2 pt-5 font-body text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            name="is_active"
                            defaultChecked={plan.is_active}
                            className="h-3.5 w-3.5 rounded border-border"
                          />
                          Active
                        </label>
                        <div className="sm:col-span-2">
                          <button type="submit" className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                            Save
                          </button>
                        </div>
                      </form>
                      <form action={deletePlan} className="mt-2">
                        <input type="hidden" name="id" value={plan.id} />
                        <button type="submit" className="font-body text-xs text-destructive hover:underline">
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
  compact = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  compact?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className={compact ? "font-body text-xs text-muted-foreground" : "font-body text-sm font-medium text-foreground"}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={
          compact
            ? "mt-1 w-full rounded-xl border border-input bg-background px-3 py-1.5 font-body text-sm text-foreground outline-none focus:border-primary"
            : "mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
        }
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
  compact = false,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
  compact?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className={compact ? "font-body text-xs text-muted-foreground" : "font-body text-sm font-medium text-foreground"}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? options[0]}
        className={
          compact
            ? "mt-1 w-full rounded-xl border border-input bg-background px-3 py-1.5 font-body text-sm text-foreground outline-none focus:border-primary"
            : "mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-sm capitalize text-foreground outline-none transition-colors focus:border-primary"
        }
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
