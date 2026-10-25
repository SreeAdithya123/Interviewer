"use client";

import { useState, useTransition } from "react";
import type { Profile } from "@/lib/auth/current-profile";
import { updateUserProfile } from "@/lib/profile/actions";
import FaceVerificationCard from "@/components/profile/FaceVerificationCard";
import {
  User,
  GraduationCap,
  Globe,
  Github,
  Linkedin,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface ProfileEditorClientProps {
  profile: Profile;
}

export function ProfileEditorClient({ profile }: ProfileEditorClientProps) {
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    fullName: profile.full_name || "",
    phone: profile.phone || "",
    bio: profile.bio || "",
    department: profile.department || "",
    graduationYear: profile.graduation_year ? String(profile.graduation_year) : "",
    targetRole: profile.target_role || "",
    targetCompanies: profile.target_companies || "",
    linkedinUrl: profile.linkedin_url || "",
    githubUrl: profile.github_url || "",
    portfolioUrl: profile.portfolio_url || "",
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaveSuccess(false);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    startTransition(async () => {
      const gradYearNum = formData.graduationYear
        ? parseInt(formData.graduationYear, 10)
        : null;

      const res = await updateUserProfile({
        fullName: formData.fullName,
        phone: formData.phone || null,
        bio: formData.bio || null,
        department: formData.department || null,
        graduationYear: Number.isNaN(gradYearNum) ? null : gradYearNum,
        targetRole: formData.targetRole || null,
        targetCompanies: formData.targetCompanies || null,
        linkedinUrl: formData.linkedinUrl || null,
        githubUrl: formData.githubUrl || null,
        portfolioUrl: formData.portfolioUrl || null,
      });

      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setErrorMessage(res.error || "Failed to update profile settings.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      {/* Header section */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Profile & Identity Settings
            </h1>
            <p className="mt-1 font-body text-sm text-muted-foreground">
              Manage your personal info, placement aspirations, and AI biometric verification.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border bg-muted/50 px-3 py-1 font-mono text-xs font-medium capitalize text-foreground">
              Role: {profile.role.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </div>

      {/* 1. Biometric Identity & Face Verification Card */}
      <FaceVerificationCard
        idPhotoUrl={profile.id_photo_url}
        idVerifiedAt={profile.id_verified_at}
        fullName={profile.full_name}
      />

      {/* 2. Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Success / Error notification */}
        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 p-4 font-body text-sm font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>Profile details saved and updated successfully!</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-2xl bg-destructive/10 p-4 font-body text-sm font-medium text-destructive border border-destructive/30">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Section A: Personal Information */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-5">
          <div className="border-b border-border/60 pb-3">
            <h2 className="flex items-center gap-2 font-headline text-base font-semibold text-foreground">
              <User className="h-4 w-4 text-primary" />
              Personal Information
            </h2>
            <p className="font-body text-xs text-muted-foreground">
              Your name and contact info displayed on assessment reports and campus rosters.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block font-body text-xs font-medium text-foreground">
                Full Name *
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Adithya Sharma"
                className="mt-1.5 w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Email Address (Read-only) */}
            <div>
              <label htmlFor="email" className="block font-body text-xs font-medium text-foreground">
                Email Address (Account Identifier)
              </label>
              <div className="relative mt-1.5">
                <input
                  id="email"
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full rounded-xl border border-border/60 bg-muted/50 px-3.5 py-2 font-body text-sm text-muted-foreground cursor-not-allowed"
                />
                <span className="absolute right-3 top-2.5 font-mono text-[10px] text-muted-foreground">
                  Verified
                </span>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block font-body text-xs font-medium text-foreground">
                Phone Number
              </label>
              <div className="relative mt-1.5">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Target Role */}
            <div>
              <label htmlFor="targetRole" className="block font-body text-xs font-medium text-foreground">
                Target Role / Focus Track
              </label>
              <input
                id="targetRole"
                name="targetRole"
                type="text"
                value={formData.targetRole}
                onChange={handleChange}
                placeholder="e.g. SDE-1, Full Stack Developer, Data Scientist"
                className="mt-1.5 w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Bio / Elevator Pitch */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="bio" className="block font-body text-xs font-medium text-foreground">
                Professional Bio / 30-Second Elevator Pitch
              </label>
              <span className="font-mono text-[10px] text-muted-foreground">
                {formData.bio.length}/500
              </span>
            </div>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              maxLength={500}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell interviewers about your key strengths, engineering passions, and proudest achievements..."
              className="mt-1.5 w-full rounded-xl border border-border/80 bg-background p-3 font-body text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            />
          </div>
        </div>

        {/* Section B: Academic & Placement Information */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-5">
          <div className="border-b border-border/60 pb-3">
            <h2 className="flex items-center gap-2 font-headline text-base font-semibold text-foreground">
              <GraduationCap className="h-4 w-4 text-primary" />
              Academic & Placement Details
            </h2>
            <p className="font-body text-xs text-muted-foreground">
              Helps customize technical interview questions, difficulty, and company blueprint benchmarks.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Department */}
            <div>
              <label htmlFor="department" className="block font-body text-xs font-medium text-foreground">
                Branch / Major
              </label>
              <input
                id="department"
                name="department"
                type="text"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g. Computer Science and Engineering"
                className="mt-1.5 w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Graduation Year */}
            <div>
              <label htmlFor="graduationYear" className="block font-body text-xs font-medium text-foreground">
                Graduation Year
              </label>
              <select
                id="graduationYear"
                name="graduationYear"
                value={formData.graduationYear}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-xl border border-border/80 bg-background px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select Year</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
              </select>
            </div>

            {/* Dream Companies */}
            <div className="sm:col-span-2">
              <label htmlFor="targetCompanies" className="block font-body text-xs font-medium text-foreground">
                Target / Dream Companies
              </label>
              <input
                id="targetCompanies"
                name="targetCompanies"
                type="text"
                value={formData.targetCompanies}
                onChange={handleChange}
                placeholder="e.g. Google, Microsoft, Amazon, Razorpay, Flipkart"
                className="mt-1.5 w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 font-body text-[11px] text-muted-foreground">
                Separated by commas. Vyoman will prioritize relevant company blueprints and rubric standards.
              </p>
            </div>
          </div>
        </div>

        {/* Section C: Social & Professional Links */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-5">
          <div className="border-b border-border/60 pb-3">
            <h2 className="flex items-center gap-2 font-headline text-base font-semibold text-foreground">
              <Globe className="h-4 w-4 text-primary" />
              Social & Portfolio Links
            </h2>
            <p className="font-body text-xs text-muted-foreground">
              Connected profiles reviewed by campus placement cells and recruiters.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* LinkedIn */}
            <div>
              <label htmlFor="linkedinUrl" className="flex items-center gap-1.5 font-body text-xs font-medium text-foreground">
                <Linkedin className="h-3.5 w-3.5 text-[#0077B5]" />
                LinkedIn Profile
              </label>
              <input
                id="linkedinUrl"
                name="linkedinUrl"
                type="url"
                value={formData.linkedinUrl}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/username"
                className="mt-1.5 w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 font-body text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
            </div>

            {/* GitHub */}
            <div>
              <label htmlFor="githubUrl" className="flex items-center gap-1.5 font-body text-xs font-medium text-foreground">
                <Github className="h-3.5 w-3.5 text-foreground" />
                GitHub Profile
              </label>
              <input
                id="githubUrl"
                name="githubUrl"
                type="url"
                value={formData.githubUrl}
                onChange={handleChange}
                placeholder="https://github.com/username"
                className="mt-1.5 w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 font-body text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
            </div>

            {/* Portfolio */}
            <div>
              <label htmlFor="portfolioUrl" className="flex items-center gap-1.5 font-body text-xs font-medium text-foreground">
                <Globe className="h-3.5 w-3.5 text-emerald-500" />
                Personal Portfolio
              </label>
              <input
                id="portfolioUrl"
                name="portfolioUrl"
                type="url"
                value={formData.portfolioUrl}
                onChange={handleChange}
                placeholder="https://yourportfolio.dev"
                className="mt-1.5 w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 font-body text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-body text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Saving Profile...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Profile Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProfileEditorClient;
