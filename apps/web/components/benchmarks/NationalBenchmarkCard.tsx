"use client";

import { useMemo } from "react";
import { generateBenchmarkReport } from "@/lib/benchmarks/percentile";

export function NationalBenchmarkCard({
  score,
  technicalDepth,
  communicationClarity,
  answerStructure,
  confidenceAndDelivery,
}: {
  score: number;
  technicalDepth?: number;
  communicationClarity?: number;
  answerStructure?: number;
  confidenceAndDelivery?: number;
}) {
  const report = useMemo(
    () =>
      generateBenchmarkReport(score, {
        technicalDepth,
        communicationClarity,
        answerStructure,
        confidenceAndDelivery,
      }),
    [score, technicalDepth, communicationClarity, answerStructure, confidenceAndDelivery]
  );

  return (
    <div className="rounded-lg border border-border/80 bg-card p-5 space-y-4 font-body">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-sm font-semibold text-foreground">
              National Engineering Cohort Benchmark
            </h3>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground uppercase">
              100,000+ Mock Pool
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Standardized percentile ranking calibrated against national campus placement test-takers across India.
          </p>
        </div>

        {/* Percentile Pill */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-foreground/20 bg-muted px-3 py-1 font-mono text-xs font-semibold tabular-nums text-foreground">
            {report.nationalPercentile}th Percentile Nationally
          </span>
        </div>
      </div>

      {/* Tier Band Callout */}
      <div className="rounded border border-border/80 bg-background/50 p-3.5 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground">Assessed Placement Tier:</span>
          <span className="font-semibold text-foreground">{report.tierBandLabel}</span>
        </div>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground text-[11px] pt-1">
          {report.hiringFitRecommendations.map((rec, i) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>
      </div>

      {/* Dimension Percentile Breakdown */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground">Competency Percentile Distribution</h4>
        <div className="mt-3 space-y-2.5 text-xs">
          {[
            { label: "Technical Depth & CS Core", pct: report.dimensionPercentiles.technicalDepth },
            { label: "Communication & Fluency", pct: report.dimensionPercentiles.communicationClarity },
            { label: "Problem Solving & Structure", pct: report.dimensionPercentiles.answerStructure },
            { label: "Delivery & Confidence", pct: report.dimensionPercentiles.confidenceAndDelivery },
          ].map((dim) => (
            <div key={dim.label} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-foreground">{dim.label}</span>
                <span className="font-mono tabular-nums text-muted-foreground">{dim.pct}%ile</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-foreground transition-all rounded-full"
                  style={{ width: `${dim.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default NationalBenchmarkCard;
