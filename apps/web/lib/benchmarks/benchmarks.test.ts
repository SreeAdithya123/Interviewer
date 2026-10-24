import { describe, expect, it } from "vitest";
import {
  calculateNationalPercentile,
  compareDepartmentBenchmarks,
  evaluateHiringTier,
  generateBenchmarkReport,
  normalCdf,
} from "./percentile";

describe("National Placement Benchmark & Percentile Engine", () => {
  it("computes normal CDF accurately", () => {
    // z = 0 -> 0.5
    expect(normalCdf(0)).toBeCloseTo(0.5, 4);
    // z = 1.96 -> ~0.975 (97.5%)
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    // z = -1.96 -> ~0.025 (2.5%)
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
  });

  it("calculates national percentile from score", () => {
    // Mean is 63.5 -> score of 63.5 should be ~50th percentile
    const medianPercentile = calculateNationalPercentile(63.5, "overall");
    expect(medianPercentile).toBeCloseTo(50.0, 0);

    // Score of 90 -> high percentile (>97th)
    const elitePercentile = calculateNationalPercentile(90.0, "overall");
    expect(elitePercentile).toBeGreaterThan(97.0);

    // Score of 40 -> low percentile (<5th)
    const lowPercentile = calculateNationalPercentile(40.0, "overall");
    expect(lowPercentile).toBeLessThan(5.0);
  });

  it("evaluates tier bands and hiring recommendations", () => {
    const elite = evaluateHiringTier(98.5);
    expect(elite.band).toBe("elite_product");
    expect(elite.label).toContain("Top 2%");
    expect(elite.recommendations[0]).toContain("Amazon SDE-1");

    const digital = evaluateHiringTier(91.0);
    expect(digital.band).toBe("digital_specialist");
    expect(digital.label).toContain("Top 10%");

    const mass = evaluateHiringTier(55.0);
    expect(mass.band).toBe("placement_ready");
  });

  it("generates candidate benchmark report with dimension percentiles", () => {
    const report = generateBenchmarkReport(82, {
      technicalDepth: 86,
      communicationClarity: 78,
    });

    expect(report.overallScore).toBe(82);
    expect(report.nationalPercentile).toBeGreaterThan(88);
    expect(report.dimensionPercentiles.technicalDepth).toBeGreaterThan(95);
    expect(report.hiringFitRecommendations.length).toBeGreaterThan(0);
  });

  it("compares college departments against national averages", () => {
    const comparisons = compareDepartmentBenchmarks({
      "Computer Science": 76.5,
      "Information Technology": 71.0,
      "Mechanical Engineering": 59.0,
    });

    expect(comparisons.length).toBe(3);
    const cse = comparisons.find((c) => c.department === "Computer Science");
    expect(cse?.deltaScore).toBeGreaterThan(0); // Better than national average
    expect(cse?.percentileRank).toBeGreaterThan(80);
  });
});
