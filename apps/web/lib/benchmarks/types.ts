/**
 * National Placement Benchmark & Percentile Engine Types.
 * Calibrated against national engineering student cohort distributions (100,000+ mock tests).
 */

export type NationalTierBand =
  | "elite_product"
  | "digital_specialist"
  | "premium_services"
  | "placement_ready"
  | "foundation_prep";

export interface BenchmarkDistribution {
  mean: number;
  standardDeviation: number;
  sampleCohortSize: number;
}

export interface CandidateBenchmarkReport {
  overallScore: number;
  nationalPercentile: number; // e.g. 94.2 means better than 94.2% of national cohort
  tierBand: NationalTierBand;
  tierBandLabel: string;
  dimensionPercentiles: {
    technicalDepth: number;
    communicationClarity: number;
    answerStructure: number;
    confidenceAndDelivery: number;
  };
  hiringFitRecommendations: string[];
}

export interface DepartmentBenchmarkComparison {
  department: string;
  collegeAverageScore: number;
  nationalAverageScore: number;
  deltaScore: number; // college - national
  percentileRank: number;
}
