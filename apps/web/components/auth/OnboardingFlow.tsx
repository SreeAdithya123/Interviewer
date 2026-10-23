"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, UserCheck, Sparkles, Building2, CheckCircle2, ArrowRight } from "lucide-react";

interface OnboardingFlowProps {
  userEmail: string;
  initialFullName?: string | null;
}

type TabType = "independent" | "college";
type Status = "idle" | "submitting" | "error";

const POPULAR_DEPARTMENTS = [
  "Computer Science & Eng (CSE)",
  "Information Technology (IT)",
  "AI & Data Science (AI/DS)",
  "Electronics & Comm (ECE)",
  "Electrical & Electronics (EEE)",
  "Mechanical Engineering",
];

const GRADUATION_YEARS = [2024, 2025, 2026, 2027, 2028];

export function OnboardingFlow({ userEmail, initialFullName }: OnboardingFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token") ?? "";

  // If a token was passed in the URL (e.g. /onboarding?token=...), default to college tab
  const [activeTab, setActiveTab] = useState<TabType>(tokenParam ? "college" : "independent");

  // Independent learner form state
  const [fullName, setFullName] = useState(
    initialFullName ?? (userEmail ? userEmail.split("@")[0].replace(/[._-]/g, " ") : ""),
  );
  const [department, setDepartment] = useState("Computer Science & Eng (CSE)");
  const [graduationYear, setGraduationYear] = useState<number>(2026);

  // College invite token state
  const [token, setToken] = useState(tokenParam);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleIndependentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/onboarding/independent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          department: department.trim(),
          graduationYear,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setStatus("error");
        setError(json?.error ?? "Something went wrong while finishing setup. Please try again.");
        return;
      }

      router.push("/app");
      router.refresh();
    } catch {
      setStatus("error");
      setError("Network error. Please check your internet connection.");
    }
  }

  async function handleCollegeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token.trim()) return;

    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setStatus("error");
        setError(json?.error ?? "Invalid or expired invitation code. Please check and try again.");
        return;
      }

      router.push("/app");
      router.refresh();
    } catch {
      setStatus("error");
      setError("Network error. Please check your internet connection.");
    }
  }

  return (
    <div className="w-full max-w-lg">
      {/* Track Selector Tabs */}
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card/60 p-1.5 shadow-soft">
        <button
          type="button"
          onClick={() => {
            setActiveTab("independent");
            setError(null);
          }}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-body text-xs font-semibold transition-all ${
            activeTab === "independent"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Independent Learner</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("college");
            setError(null);
          }}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-body text-xs font-semibold transition-all ${
            activeTab === "college"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>College Batch Code</span>
        </button>
      </div>

      {/* Independent Learner Pathway */}
      {activeTab === "independent" && (
        <form
          onSubmit={handleIndependentSubmit}
          className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8 space-y-6"
        >
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-0.5 font-body text-xs font-semibold text-emerald-600">
              <Sparkles className="h-3 w-3" />
              <span>Direct Self-Paced Access</span>
            </div>
            <h2 className="font-headline text-xl font-bold text-foreground">
              Set up your practice profile
            </h2>
            <p className="font-body text-xs text-muted-foreground">
              No college invitation code needed. Start practicing AI mock interviews and coding right away.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="font-body text-xs font-medium text-foreground">
                Your Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="department" className="font-body text-xs font-medium text-foreground">
                Target Discipline / Department
              </label>
              <select
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
              >
                {POPULAR_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="gradYear" className="font-body text-xs font-medium text-foreground">
                Graduation Year
              </label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {GRADUATION_YEARS.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setGraduationYear(yr)}
                    className={`rounded-xl px-3.5 py-1.5 font-body text-xs font-semibold transition-all ${
                      graduationYear === yr
                        ? "border border-primary/40 bg-primary/10 text-primary"
                        : "border border-border bg-background text-muted-foreground hover:border-primary/20"
                    }`}
                  >
                    Class of {yr}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Benefits Feature Checklist */}
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 space-y-2">
            <p className="font-body text-xs font-medium text-foreground">Included with Independent Access:</p>
            <div className="grid grid-cols-1 gap-1.5 font-body text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>AI Technical & HR Mock Interviews with real-time feedback</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Interactive Monaco Code Sandbox & automated test execution</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Honest ATS Resume Scanner and bullet rewriting assistant</span>
              </div>
            </div>
          </div>

          {status === "error" && error && (
            <p className="rounded-2xl bg-destructive/10 px-4 py-3 font-body text-xs text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "submitting" || !fullName.trim()}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span>{status === "submitting" ? "Launching Workspace..." : "Start Practicing Now"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => {
                setActiveTab("college");
                setError(null);
              }}
              className="font-body text-xs text-primary hover:underline"
            >
              Have a college code from your campus? Enter it here &rarr;
            </button>
          </div>
        </form>
      )}

      {/* College Batch Invite Code Pathway */}
      {activeTab === "college" && (
        <form
          onSubmit={handleCollegeSubmit}
          className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8 space-y-6"
        >
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-0.5 font-body text-xs font-semibold text-primary">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Campus Batch Integration</span>
            </div>
            <h2 className="font-headline text-xl font-bold text-foreground">
              Join your College Cohort
            </h2>
            <p className="font-body text-xs text-muted-foreground">
              Enter the unique 64-character invite token or onboarding link provided by your TPO / College Admin.
            </p>
          </div>

          <div>
            <label htmlFor="token" className="font-body text-xs font-medium text-foreground">
              Invitation Code / Token
            </label>
            <input
              id="token"
              name="token"
              type="text"
              required
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste the invitation token from your college"
              className="mt-1.5 w-full rounded-2xl border border-input bg-background px-4 py-3 font-mono text-xs text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>

          <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 space-y-2">
            <p className="font-body text-xs font-medium text-foreground">College Batch Privileges:</p>
            <div className="grid grid-cols-1 gap-1.5 font-body text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Verified student badge for your university (e.g. SASI, IIT, NIT)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Direct eligibility for campus-exclusive Placement Drives</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Batch placement leaderboard & cohort ranking</span>
              </div>
            </div>
          </div>

          {status === "error" && error && (
            <p className="rounded-2xl bg-destructive/10 px-4 py-3 font-body text-xs text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "submitting" || !token.trim()}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span>{status === "submitting" ? "Linking to Batch..." : "Join College Batch"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => {
                setActiveTab("independent");
                setError(null);
              }}
              className="font-body text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Don&apos;t have an invite code? Continue as an Independent Learner &rarr;
            </button>
          </div>
        </form>
      )}

      {/* Current user badge */}
      <p className="mt-6 text-center font-body text-xs text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{userEmail}</span>.
      </p>
    </div>
  );
}

export default OnboardingFlow;
