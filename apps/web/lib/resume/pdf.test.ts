import { describe, expect, it } from "vitest";
import { generateResumePdf } from "./pdf";
import { emptyResumeData } from "./empty";
import type { ResumeData } from "./types";

// Smoke tests for both ATS-safe templates (BUILD_SPEC Part 4.3: "at least
// 2 ATS-safe PDF export templates"). Doesn't assert on rendered pixels —
// just that both templates build a real jsPDF document (with real text
// objects, not a canvas snapshot) for an empty resume and a populated one,
// including one long enough to force a page break.

function sampleResume(): ResumeData {
  const data = emptyResumeData();
  data.basics = {
    name: "Priya Sharma",
    label: "Final-year CS student",
    email: "priya@example.com",
    phone: "+91 90000 00000",
    location: "Hyderabad, India",
    summary: "Aspiring backend engineer with a focus on distributed systems.",
    profiles: [{ id: "1", network: "GitHub", url: "https://github.com/priya" }],
  };
  data.education = [
    { id: "1", institution: "IIT Hyderabad", area: "Computer Science", studyType: "B.Tech", startDate: "2022", endDate: "2026", score: "8.7 CGPA" },
  ];
  data.work = [
    {
      id: "1",
      name: "Acme Corp",
      position: "SWE Intern",
      startDate: "May 2025",
      endDate: "Jul 2025",
      summary: "",
      highlights: ["Reduced API latency by 30% by adding a caching layer", "Shipped a feature used by 1,200 daily users"],
    },
  ];
  data.projects = [
    { id: "1", name: "Readiness tracker", description: "A dashboard for placement readiness.", url: "", keywords: ["React", "Supabase"], highlights: ["Built a real-time dashboard for 50 students"] },
  ];
  data.skills = [{ id: "1", name: "Languages", keywords: ["Python", "TypeScript", "SQL"] }];
  data.certificates = [{ id: "1", name: "AWS Cloud Practitioner", issuer: "AWS", date: "2025", url: "" }];
  data.awards = [{ id: "1", title: "Winner, Smart India Hackathon", date: "2025", awarder: "", summary: "Built a placement tool for 10 colleges" }];
  return data;
}

describe("generateResumePdf", () => {
  it("builds a minimal-professional PDF for an empty resume without throwing", () => {
    const doc = generateResumePdf(emptyResumeData(), "minimal-professional");
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("builds a modern-corporate PDF for an empty resume without throwing", () => {
    const doc = generateResumePdf(emptyResumeData(), "modern-corporate");
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("embeds real selectable text for a populated resume, both templates", () => {
    // jsPDF has no "extract text back out" API, so this reads the raw PDF
    // content stream instead (jsPDF doesn't compress it by default): a
    // real `(Priya Sharma) Tj` text-show operator proves the name was
    // written as actual PDF text, not drawn as an image/canvas snapshot —
    // exactly the ATS-safety property BUILD_SPEC Part 4.3 requires.
    const data = sampleResume();

    const minimalBytes = Buffer.from(generateResumePdf(data, "minimal-professional").output("arraybuffer"));
    const minimalRaw = minimalBytes.toString("latin1");
    expect(minimalRaw).toContain("Priya Sharma");
    expect(minimalRaw).toContain("Acme Corp");

    const modernBytes = Buffer.from(generateResumePdf(data, "modern-corporate").output("arraybuffer"));
    const modernRaw = modernBytes.toString("latin1");
    expect(modernRaw).toContain("Priya Sharma");
    expect(modernRaw).toContain("Acme Corp");
  });

  it("paginates instead of throwing when a section is long enough to overflow one page", () => {
    const data = sampleResume();
    data.work = Array.from({ length: 15 }, (_, i) => ({
      id: String(i),
      name: `Company ${i}`,
      position: `Role ${i}`,
      startDate: "2023",
      endDate: "2024",
      summary: "",
      highlights: ["Did something measurable, improving a metric by 20%", "Did something else, saving 5 hours a week"],
    }));
    const doc = generateResumePdf(data, "minimal-professional");
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });
});
