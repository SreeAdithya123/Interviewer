import { describe, expect, it } from "vitest";
import { scanResume } from "./scan-resume";
import { emptyResumeData } from "@/lib/resume/empty";

// BUILD_SPEC Part 4.4: four honest checks, never a single ATS score.

describe("scanResume", () => {
  it("returns all four checks, with jd_match null when no job description was given", async () => {
    const result = await scanResume({
      resumeData: null,
      uploadedFileName: "resume.pdf",
      uploadedFileSizeBytes: 102400,
      jobDescriptionText: null,
    });

    expect(result.parse_health).toBeDefined();
    expect(result.bullet_quality).toBeDefined();
    expect(result.formatting_risks).toBeDefined();
    expect(result.jd_match).toBeNull();
  });

  it("never includes a single overall ATS score field anywhere in the result", async () => {
    const result = await scanResume({
      resumeData: null,
      uploadedFileName: "resume.pdf",
      uploadedFileSizeBytes: 1000,
      jobDescriptionText: "Looking for a Python and React developer.",
    });

    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toContain("ats_score");
    expect(serialized).not.toContain("overallscore");
    expect(serialized).not.toContain("overall_score");
  });

  it("computes jd_match from the job description when one is pasted", async () => {
    const data = emptyResumeData();
    data.skills = [{ id: "1", name: "Languages", keywords: ["Python", "SQL"] }];

    const result = await scanResume({
      resumeData: data,
      uploadedFileName: null,
      uploadedFileSizeBytes: null,
      jobDescriptionText: "We need a Python developer who also knows React and AWS.",
    });

    expect(result.jd_match).not.toBeNull();
    expect(result.jd_match?.skills_present).toContain("python");
    expect(result.jd_match?.skills_missing.map((m) => m.skill)).toEqual(expect.arrayContaining(["react", "aws"]));
  });

  it("echoes the student's real bullets back instead of inventing resume content", async () => {
    const data = emptyResumeData();
    data.work = [
      { id: "1", name: "Acme", position: "Intern", startDate: "2025", endDate: "2025", summary: "", highlights: ["Shipped a feature used by 500 users"] },
    ];

    const result = await scanResume({ resumeData: data, uploadedFileName: null, uploadedFileSizeBytes: null, jobDescriptionText: null });

    const texts = result.bullet_quality.bullets.map((b) => b.text);
    expect(texts).toContain("Shipped a feature used by 500 users");
  });
});
