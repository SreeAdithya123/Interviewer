import { describe, expect, it } from "vitest";
import { COMPANY_BLUEPRINTS, getBlueprintById, getBlueprintsByCategory } from "./catalog";

describe("Company Hiring Blueprints Catalog", () => {
  it("contains all major tier-1 mass recruiter & product blueprints", () => {
    const ids = COMPANY_BLUEPRINTS.map((b) => b.id);
    expect(ids).toContain("bp_tcs_nqt");
    expect(ids).toContain("bp_infosys");
    expect(ids).toContain("bp_accenture");
    expect(ids).toContain("bp_cognizant");
    expect(ids).toContain("bp_amazon");
    expect(ids).toContain("bp_wipro");
  });

  it("retrieves blueprint by id and slug", () => {
    const tcs = getBlueprintById("bp_tcs_nqt");
    expect(tcs).toBeDefined();
    expect(tcs?.companyName).toContain("Tata Consultancy Services");

    const tcsBySlug = getBlueprintById("tcs-nqt");
    expect(tcsBySlug).toBeDefined();
    expect(tcsBySlug?.id).toBe("bp_tcs_nqt");
  });

  it("filters blueprints by category", () => {
    const massRecruiters = getBlueprintsByCategory("mass_recruiter");
    expect(massRecruiters.length).toBeGreaterThanOrEqual(4);

    const productFirms = getBlueprintsByCategory("product_firm");
    expect(productFirms.length).toBeGreaterThanOrEqual(1);
    expect(productFirms[0].companyName).toContain("Amazon");
  });

  it("verifies rounds and syllabus structure for TCS NQT", () => {
    const tcs = getBlueprintById("bp_tcs_nqt");
    expect(tcs?.rounds.length).toBe(3);
    const codingRound = tcs?.rounds.find((r) => r.type === "coding");
    expect(codingRound).toBeDefined();
    expect(codingRound?.cutoffScore).toBe(75);
    expect(codingRound?.sampleQuestions.length).toBeGreaterThan(0);
  });

  it("verifies Amazon blueprint has SDE-1 hiring tiers and STAR leadership principles", () => {
    const amzn = getBlueprintById("bp_amazon");
    expect(amzn?.hiringTiers[0].name).toContain("SDE-1");
    expect(amzn?.systemPromptModifier).toContain("STAR format");
    expect(amzn?.keyCompetencies).toContain("Amazon 16 Leadership Principles (STAR format answers)");
  });
});
