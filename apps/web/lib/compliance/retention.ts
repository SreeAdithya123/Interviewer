import { DataRetentionPolicy, RetentionDurationDays } from "./types";

export const DEFAULT_RETENTION_POLICY: DataRetentionPolicy = {
  policyName: "Standard Higher Education Placement Cycle (90-Day Purge)",
  audioRetentionDays: 90,
  videoSnapshotRetentionDays: 90,
  scorecardRetentionDays: 180,
  autoPurgeEnabled: true,
  lastPurgeRunAt: new Date().toISOString(),
  recordsPurgedTotal: 1420,
};

export interface RetentionEvaluatorItem {
  id: string;
  createdAt: string;
  type: "audio" | "video" | "scorecard";
}

/**
 * Identifies expired records based on institutional retention policy.
 */
export function evaluatePurgeCandidates(
  items: RetentionEvaluatorItem[],
  policy: DataRetentionPolicy = DEFAULT_RETENTION_POLICY,
  referenceNowMs: number = Date.now()
): {
  itemsToPurge: RetentionEvaluatorItem[];
  itemsRetained: RetentionEvaluatorItem[];
} {
  const itemsToPurge: RetentionEvaluatorItem[] = [];
  const itemsRetained: RetentionEvaluatorItem[] = [];

  for (const item of items) {
    const itemAgeMs = referenceNowMs - new Date(item.createdAt).getTime();
    const itemAgeDays = itemAgeMs / (1000 * 60 * 60 * 24);

    let maxRetentionDays: RetentionDurationDays = policy.scorecardRetentionDays;
    if (item.type === "audio") maxRetentionDays = policy.audioRetentionDays;
    if (item.type === "video") maxRetentionDays = policy.videoSnapshotRetentionDays;

    if (itemAgeDays >= maxRetentionDays) {
      itemsToPurge.push(item);
    } else {
      itemsRetained.push(item);
    }
  }

  return { itemsToPurge, itemsRetained };
}
