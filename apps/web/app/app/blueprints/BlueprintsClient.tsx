"use client";

import { useState } from "react";
import Link from "next/link";
import { COMPANY_BLUEPRINTS } from "@/lib/blueprints/catalog";
import type { BlueprintCategory, CompanyBlueprint } from "@/lib/blueprints/types";

const CATEGORIES: { label: string; value: "all" | BlueprintCategory }[] = [
  { label: "All Recruiters", value: "all" },
  { label: "Mass Recruiters (TCS, INFY, CTS)", value: "mass_recruiter" },
  { label: "Product & GCC (Amazon)", value: "product_firm" },
  { label: "Consulting (Accenture)", value: "consulting" },
];

export function BlueprintsClient() {
  const [selectedCategory, setSelectedCategory] = useState<"all" | BlueprintCategory>("all");
  const [activeBlueprint, setActiveBlueprint] = useState<CompanyBlueprint | null>(COMPANY_BLUEPRINTS[0]);

  const filtered =
    selectedCategory === "all"
      ? COMPANY_BLUEPRINTS
      : COMPANY_BLUEPRINTS.filter((b) => b.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Title & Scope */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Company Hiring Blueprints
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Calibrated campus test packs modeled after real hiring patterns, cutoff scores, and multi-round interviews.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{COMPANY_BLUEPRINTS.length}</span> certified blueprint packs
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/80 pb-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedCategory === cat.value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid of Company Blueprints */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((bp) => {
          const isSelected = activeBlueprint?.id === bp.id;
          return (
            <div
              key={bp.id}
              onClick={() => setActiveBlueprint(bp)}
              className={`cursor-pointer rounded-lg border p-4 transition-all ${
                isSelected
                  ? "border-foreground bg-card ring-1 ring-foreground/20"
                  : "border-border/80 bg-card hover:border-foreground/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-white"
                    style={{ backgroundColor: bp.brandColor || "#1e293b" }}
                  >
                    {bp.logoText}
                  </div>
                  <div>
                    <h2 className="font-heading text-sm font-semibold">{bp.companyName}</h2>
                    <p className="text-xs text-muted-foreground">{bp.shortCode}</p>
                  </div>
                </div>
                <span className="rounded border border-border/80 bg-muted px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums text-foreground">
                  {bp.typicalPackageCtc}
                </span>
              </div>

              <p className="mt-3 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                {bp.overview}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3 text-[11px]">
                <span className="text-muted-foreground">Tiers:</span>
                {bp.hiringTiers.map((t) => (
                  <span
                    key={t.name}
                    className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground font-mono text-[10px]"
                  >
                    {t.name} ({t.ctc})
                  </span>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">
                  {bp.rounds.length} Assessment Rounds
                </span>
                <Link
                  href={`/app/interview?blueprint=${bp.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background hover:opacity-90"
                >
                  Start Simulation
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Blueprint Deep-Dive Panel */}
      {activeBlueprint && (
        <div className="rounded-lg border border-border/80 bg-card p-5 space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground uppercase">
                  Active Simulation Spec
                </span>
                <span className="text-xs text-muted-foreground">• {activeBlueprint.selectionRatioEst}</span>
              </div>
              <h2 className="mt-1 font-heading text-lg font-semibold">
                {activeBlueprint.companyName} Blueprint Structure
              </h2>
            </div>
            <Link
              href={`/app/interview?blueprint=${activeBlueprint.id}`}
              className="inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2 text-xs font-medium text-background hover:opacity-90"
            >
              Launch {activeBlueprint.shortCode} Mock Interview
            </Link>
          </div>

          {/* Hiring Tiers Table */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground">Package Tiers & Cutoffs</h3>
            <div className="mt-2 overflow-x-auto rounded border border-border/80">
              <table className="w-full border-collapse text-left font-body text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40">
                    <th className="px-3 py-2 font-medium text-muted-foreground">Tier Name</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Annual CTC</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Min Benchmark Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {activeBlueprint.hiringTiers.map((tier) => (
                    <tr key={tier.name} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium text-foreground">{tier.name}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{tier.ctc}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                        {tier.minScore} / 100
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rounds Detailed Timeline */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground">Recruitment Assessment Rounds</h3>
            <div className="mt-3 space-y-3">
              {activeBlueprint.rounds.map((round) => (
                <div
                  key={round.roundNumber}
                  className="rounded-lg border border-border/80 bg-background/50 p-4 space-y-3"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                        {round.roundNumber}
                      </span>
                      <h4 className="font-heading text-sm font-semibold">{round.name}</h4>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                        {round.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-muted-foreground">
                      <span>⏱ {round.durationMinutes} mins</span>
                      <span>•</span>
                      <span>Cutoff: {round.cutoffScore}%</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {round.description}
                  </p>

                  {/* Syllabus tags */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-muted-foreground">Syllabus:</span>
                    {round.syllabus.map((syl) => (
                      <span
                        key={syl}
                        className="rounded border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] text-foreground"
                      >
                        {syl}
                      </span>
                    ))}
                  </div>

                  {/* Sample Problem preview */}
                  {round.sampleQuestions.length > 0 && (
                    <div className="rounded border border-border/60 bg-muted/20 p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          Sample Challenge: {round.sampleQuestions[0].title}
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground capitalize">
                          {round.sampleQuestions[0].difficulty}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        "{round.sampleQuestions[0].prompt}"
                      </p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {round.sampleQuestions[0].expectedConcepts.map((c) => (
                          <span
                            key={c}
                            className="rounded bg-background px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground border border-border/60"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Expert Preparation Tips */}
          <div className="rounded-lg border border-border/80 bg-muted/10 p-4 space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">TPO Strategic Placement Advice</h3>
            <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
              {activeBlueprint.interviewTips.map((tip, idx) => (
                <li key={idx} className="leading-relaxed">
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
