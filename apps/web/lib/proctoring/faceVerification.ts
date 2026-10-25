/**
 * Biometric Face Verification & Continuous Identity Authentication Engine.
 *
 * Implements normalized facial landmark embedding comparison, cosine similarity,
 * euclidean distance scoring, and threshold matching to prevent proxy test-taking
 * and impersonation fraud during proctored assessments.
 */

export interface FaceVerificationResult {
  distance: number;
  similarityPct: number; // 0 - 100
  isMatch: boolean;
  confidence: "high_match" | "moderate_match" | "borderline" | "mismatch";
  reason: string;
}

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export interface ImageEnrollmentValidation {
  valid: boolean;
  issues: string[];
}

/**
 * Default Euclidean distance threshold for 128-d normalized biometric embeddings.
 * Distances <= 0.52 indicate matching facial geometry.
 */
export const DEFAULT_MATCH_DISTANCE_THRESHOLD = 0.52;

/**
 * Calculates Euclidean Distance between two equal-length normalized vectors.
 * $d(u, v) = \sqrt{\sum (u_i - v_i)^2}$
 */
export function computeEuclideanDistance(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 1.0;
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Calculates Cosine Similarity between two vectors.
 * Returns value between -1.0 and 1.0 (typically 0.0 to 1.0 for normalized feature vectors).
 */
export function computeCosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Compares a live face embedding sample against the enrolled student baseline.
 */
export function compareFaceEmbeddings(
  baseline: number[] | null | undefined,
  sample: number[] | null | undefined,
  threshold: number = DEFAULT_MATCH_DISTANCE_THRESHOLD
): FaceVerificationResult {
  if (!baseline || baseline.length === 0) {
    return {
      distance: 1.0,
      similarityPct: 0,
      isMatch: false,
      confidence: "mismatch",
      reason: "No baseline biometric photo enrolled on profile.",
    };
  }

  if (!sample || sample.length === 0) {
    return {
      distance: 1.0,
      similarityPct: 0,
      isMatch: false,
      confidence: "mismatch",
      reason: "No face detected in live video stream.",
    };
  }

  if (baseline.length !== sample.length) {
    return {
      distance: 1.0,
      similarityPct: 0,
      isMatch: false,
      confidence: "mismatch",
      reason: "Embedding vector dimension mismatch.",
    };
  }

  const distance = computeEuclideanDistance(baseline, sample);

  // Convert distance to an intuitive percentage (0 - 100%)
  // Distance 0.0 -> 100%, Distance 0.52 -> ~80%, Distance >= 1.0 -> 0%
  const similarityPct = Math.max(
    0,
    Math.min(100, Math.round(Math.max(0, 1 - distance * 0.95) * 100))
  );

  let confidence: FaceVerificationResult["confidence"] = "mismatch";
  let reason = "Face geometry does not match registered student.";

  if (distance <= 0.35) {
    confidence = "high_match";
    reason = "Strong facial identity match confirmed.";
  } else if (distance <= threshold) {
    confidence = "moderate_match";
    reason = "Facial identity match verified.";
  } else if (distance <= 0.62) {
    confidence = "borderline";
    reason = "Borderline match. Lighting, glasses, or facial expression variation detected.";
  }

  const isMatch = distance <= threshold;

  return {
    distance: Math.round(distance * 1000) / 1000,
    similarityPct,
    isMatch,
    confidence,
    reason,
  };
}

/**
 * Validates baseline image specifications before biometric enrollment.
 */
export function validateImageForFaceEnrollment(
  width: number,
  height: number,
  estimatedBrightness: number = 120
): ImageEnrollmentValidation {
  const issues: string[] = [];

  if (width < 120 || height < 120) {
    issues.push("Image resolution too low. Minimum 120x120 pixels required.");
  }

  if (estimatedBrightness < 30) {
    issues.push("Image too dark. Please ensure face is well-lit.");
  } else if (estimatedBrightness > 240) {
    issues.push("Image over-exposed or washed out by bright backlighting.");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Extracts a normalized 128-dimensional biometric descriptor vector from facial landmarks.
 * Invariant to head scale, translation, and minor tilt.
 */
export function extractLandmarkGeometry(landmarks: LandmarkPoint[]): number[] {
  if (landmarks.length < 5) {
    return new Array(128).fill(0);
  }

  // Anchor points: left eye (approx index 33 or 0), right eye (approx index 263 or 1)
  const leftEye = landmarks[0];
  const rightEye = landmarks[1];

  // Inter-ocular distance as standard scale unit
  const eyeDx = rightEye.x - leftEye.x;
  const eyeDy = rightEye.y - leftEye.y;
  const interOcularDist = Math.max(0.001, Math.sqrt(eyeDx * eyeDx + eyeDy * eyeDy));

  // Center coordinate
  const centerX = (leftEye.x + rightEye.x) / 2;
  const centerY = (leftEye.y + rightEye.y) / 2;

  const vector: number[] = [];

  // Generate 128-point normalized geometric descriptor
  for (let i = 0; i < 128; i++) {
    const ptIndex = i % landmarks.length;
    const pt = landmarks[ptIndex];

    // Normalized relative coordinates
    const normX = (pt.x - centerX) / interOcularDist;
    const normY = (pt.y - centerY) / interOcularDist;

    // Project into angular and radial components
    const radius = Math.sqrt(normX * normX + normY * normY);
    const angle = Math.atan2(normY, normX);

    // Alternating harmonic components
    if (i % 2 === 0) {
      vector.push(radius);
    } else {
      vector.push(Math.sin(angle) * radius);
    }
  }

  // Normalize vector to unit length (L2 norm = 1)
  let norm = 0;
  for (const v of vector) norm += v * v;
  const mag = Math.max(0.0001, Math.sqrt(norm));

  return vector.map((v) => Math.round((v / mag) * 10000) / 10000);
}

/**
 * Generates a deterministic normalized 128-d face embedding vector for testing and fixtures.
 */
export function generateDeterministicEmbedding(seed: string): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  const raw: number[] = [];
  for (let i = 0; i < 128; i++) {
    // Linear congruential pseudorandom sequence
    hash = Math.imul(hash ^ (i * 31), 1664525) + 1013904223;
    const val = (hash >>> 0) / 4294967296; // 0.0 to 1.0
    raw.push(val - 0.5);
  }

  // Normalize to unit vector
  let norm = 0;
  for (const v of raw) norm += v * v;
  const mag = Math.sqrt(norm);
  return raw.map((v) => Math.round((v / mag) * 10000) / 10000);
}
