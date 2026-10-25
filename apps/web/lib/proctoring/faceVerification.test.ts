import { describe, expect, it } from "vitest";
import {
  compareFaceEmbeddings,
  computeCosineSimilarity,
  computeEuclideanDistance,
  extractLandmarkGeometry,
  generateDeterministicEmbedding,
  validateImageForFaceEnrollment,
} from "./faceVerification";

describe("Biometric Face Verification Engine", () => {
  it("computes exact distance 0 and similarity 1 for identical vectors", () => {
    const v1 = generateDeterministicEmbedding("candidate_adithya_2026");
    const distance = computeEuclideanDistance(v1, v1);
    const cosSim = computeCosineSimilarity(v1, v1);

    expect(distance).toBeCloseTo(0, 4);
    expect(cosSim).toBeCloseTo(1, 4);

    const match = compareFaceEmbeddings(v1, v1);
    expect(match.isMatch).toBe(true);
    expect(match.confidence).toBe("high_match");
    expect(match.similarityPct).toBe(100);
  });

  it("identifies high match for minor pose/lighting variations of same candidate", () => {
    const baseline = generateDeterministicEmbedding("candidate_adithya_2026");
    // Minor perturbation simulating natural facial movement
    const liveSample = baseline.map((v, i) => v + (i % 5 === 0 ? 0.02 : -0.01));

    // Normalize perturbed vector
    const norm = Math.sqrt(liveSample.reduce((sum, val) => sum + val * val, 0));
    const normalizedSample = liveSample.map((val) => val / norm);

    const match = compareFaceEmbeddings(baseline, normalizedSample);
    expect(match.isMatch).toBe(true);
    expect(match.distance).toBeLessThan(0.40);
    expect(match.similarityPct).toBeGreaterThan(80);
  });

  it("detects impersonation mismatch when an impostor takes the interview", () => {
    const realStudent = generateDeterministicEmbedding("student_rahul_sharma");
    const proxyCandidate = generateDeterministicEmbedding("impostor_vikram_patel");

    const match = compareFaceEmbeddings(realStudent, proxyCandidate);
    expect(match.isMatch).toBe(false);
    expect(match.confidence).toBe("mismatch");
    expect(match.distance).toBeGreaterThan(0.60);
    expect(match.similarityPct).toBeLessThan(60);
    expect(match.reason).toContain("does not match registered student");
  });

  it("handles missing baseline or missing live face cleanly without throwing", () => {
    const vector = generateDeterministicEmbedding("student_test");

    const noBaseline = compareFaceEmbeddings(null, vector);
    expect(noBaseline.isMatch).toBe(false);
    expect(noBaseline.reason).toContain("No baseline biometric photo enrolled");

    const noLiveFace = compareFaceEmbeddings(vector, null);
    expect(noLiveFace.isMatch).toBe(false);
    expect(noLiveFace.reason).toContain("No face detected in live video");
  });

  it("validates enrollment image dimensions and illumination", () => {
    const valid = validateImageForFaceEnrollment(640, 480, 128);
    expect(valid.valid).toBe(true);
    expect(valid.issues.length).toBe(0);

    const tooSmall = validateImageForFaceEnrollment(80, 80, 120);
    expect(tooSmall.valid).toBe(false);
    expect(tooSmall.issues[0]).toContain("resolution too low");

    const tooDark = validateImageForFaceEnrollment(640, 480, 15);
    expect(tooDark.valid).toBe(false);
    expect(tooDark.issues[0]).toContain("Image too dark");
  });

  it("extracts 128-dimensional normalized landmark geometry vector", () => {
    const landmarks = [
      { x: 100, y: 120, z: 0 },
      { x: 200, y: 120, z: 0 },
      { x: 150, y: 160, z: 10 },
      { x: 120, y: 200, z: -5 },
      { x: 180, y: 200, z: -5 },
      { x: 150, y: 240, z: 0 },
    ];

    const descriptor = extractLandmarkGeometry(landmarks);
    expect(descriptor.length).toBe(128);

    // Vector must be normalized (L2 norm approx 1)
    const norm = Math.sqrt(descriptor.reduce((sum, val) => sum + val * val, 0));
    expect(norm).toBeCloseTo(1, 2);
  });
});
