import { jsPDF } from "jspdf";
import type { ResumeData, ResumeTemplateId } from "./types";

// ATS-safe PDF export (BUILD_SPEC Part 4.3): single column, real selectable
// text, no tables, no text rendered as an image. Built with jsPDF's own
// text-layout API (doc.text/splitTextToSize), never html2canvas — rendering
// the DOM to a canvas and embedding that as an image is exactly the
// "text in images" failure mode the spec forbids, even though it's the
// easier path and what a lot of resume-builder tutorials reach for.

const PAGE_WIDTH = 612; // US Letter, points (72pt/in)
const PAGE_HEIGHT = 792;
const MARGIN = 54; // 0.75in
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

class Cursor {
  doc: jsPDF;
  y: number;

  constructor(doc: jsPDF) {
    this.doc = doc;
    this.y = MARGIN;
  }

  ensureSpace(height: number) {
    if (this.y + height > PAGE_HEIGHT - MARGIN) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  text(line: string, x: number, size: number, options?: { font?: string; style?: string; color?: [number, number, number]; gap?: number }) {
    if (!line) return;
    this.doc.setFont(options?.font ?? "helvetica", options?.style ?? "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...(options?.color ?? [20, 20, 23]));
    this.ensureSpace(size);
    this.doc.text(line, x, this.y);
    this.y += (options?.gap ?? size * 1.25);
  }

  wrapped(line: string, x: number, size: number, maxWidth: number, options?: { font?: string; style?: string; color?: [number, number, number] }) {
    if (!line) return;
    this.doc.setFont(options?.font ?? "helvetica", options?.style ?? "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(...(options?.color ?? [20, 20, 23]));
    const lines: string[] = this.doc.splitTextToSize(line, maxWidth);
    for (const l of lines) {
      this.ensureSpace(size * 1.3);
      this.doc.text(l, x, this.y);
      this.y += size * 1.3;
    }
  }

  gap(amount: number) {
    this.y += amount;
  }

  rule(color: [number, number, number] = [220, 220, 226]) {
    this.ensureSpace(4);
    this.doc.setDrawColor(...color);
    this.doc.setLineWidth(0.75);
    this.doc.line(MARGIN, this.y, PAGE_WIDTH - MARGIN, this.y);
    this.y += 10;
  }
}

function dateRange(start: string, end: string): string {
  if (!start && !end) return "";
  return [start, end].filter(Boolean).join(" – ");
}

function buildMinimalProfessional(doc: jsPDF, data: ResumeData) {
  const c = new Cursor(doc);
  const ink: [number, number, number] = [30, 58, 95]; // deep indigo-blue heading ink
  const muted: [number, number, number] = [100, 100, 111];

  c.text(data.basics.name || "Your Name", MARGIN, 22, { font: "times", style: "bold", color: ink, gap: 26 });
  const contactLine = [data.basics.email, data.basics.phone, data.basics.location, ...data.basics.profiles.map((p) => p.url)]
    .filter(Boolean)
    .join("   |   ");
  c.wrapped(contactLine, MARGIN, 9.5, CONTENT_WIDTH, { color: muted });
  c.gap(6);
  c.rule();

  if (data.basics.summary) {
    c.wrapped(data.basics.summary, MARGIN, 10, CONTENT_WIDTH, { font: "times", style: "italic", color: [70, 70, 78] });
    c.gap(10);
  }

  const section = (label: string) => {
    c.gap(2);
    c.text(label.toUpperCase(), MARGIN, 10, { style: "bold", color: ink, gap: 14 });
  };

  if (data.work.length > 0) {
    section("Experience");
    for (const job of data.work) {
      c.text(job.position || "Role", MARGIN, 11, { font: "times", style: "bold", gap: 13 });
      c.wrapped(`${job.name || ""}${job.name ? "   " : ""}${dateRange(job.startDate, job.endDate)}`, MARGIN, 9.5, CONTENT_WIDTH, { color: muted });
      for (const h of job.highlights) {
        c.wrapped(`— ${h}`, MARGIN + 4, 9.5, CONTENT_WIDTH - 4);
      }
      c.gap(6);
    }
  }

  if (data.education.length > 0) {
    section("Education");
    for (const edu of data.education) {
      c.text(`${edu.studyType || "Degree"}${edu.area ? ` in ${edu.area}` : ""}`, MARGIN, 10.5, { font: "times", style: "bold", gap: 12 });
      c.wrapped(`${edu.institution || ""}   ${dateRange(edu.startDate, edu.endDate)}${edu.score ? `   ${edu.score}` : ""}`, MARGIN, 9.5, CONTENT_WIDTH, { color: muted });
      c.gap(4);
    }
  }

  if (data.skills.length > 0) {
    section("Skills");
    for (const group of data.skills) {
      c.wrapped(`${group.name ? `${group.name}: ` : ""}${group.keywords.join(", ")}`, MARGIN, 9.5, CONTENT_WIDTH);
    }
    c.gap(6);
  }

  if (data.projects.length > 0) {
    section("Projects");
    for (const project of data.projects) {
      c.text(project.name || "Project", MARGIN, 10.5, { font: "times", style: "bold", gap: 12 });
      if (project.description) c.wrapped(project.description, MARGIN, 9.5, CONTENT_WIDTH);
      for (const h of project.highlights) {
        c.wrapped(`— ${h}`, MARGIN + 4, 9.5, CONTENT_WIDTH - 4);
      }
      if (project.keywords.length > 0) c.wrapped(project.keywords.join(" · "), MARGIN, 9, CONTENT_WIDTH, { color: muted });
      c.gap(5);
    }
  }

  if (data.certificates.length > 0) {
    section("Certifications");
    for (const cert of data.certificates) {
      c.wrapped(`${cert.name}${cert.issuer ? ` — ${cert.issuer}` : ""}${cert.date ? ` (${cert.date})` : ""}`, MARGIN, 9.5, CONTENT_WIDTH);
    }
    c.gap(4);
  }

  if (data.awards.length > 0) {
    section("Achievements");
    for (const award of data.awards) {
      c.wrapped(`${award.title}${award.summary ? ` — ${award.summary}` : ""}`, MARGIN, 9.5, CONTENT_WIDTH);
    }
  }
}

function buildModernCorporate(doc: jsPDF, data: ResumeData) {
  const c = new Cursor(doc);
  const ink: [number, number, number] = [37, 99, 235];
  const muted: [number, number, number] = [90, 90, 100];

  c.text(data.basics.name || "Your Name", MARGIN, 24, { style: "bold", color: [20, 20, 23], gap: 24 });
  if (data.basics.label) c.text(data.basics.label, MARGIN, 11, { color: ink, style: "bold", gap: 16 });
  const contactLine = [data.basics.email, data.basics.phone, data.basics.location, ...data.basics.profiles.map((p) => p.url)]
    .filter(Boolean)
    .join("   ·   ");
  c.wrapped(contactLine, MARGIN, 9.5, CONTENT_WIDTH, { color: muted });
  c.gap(8);
  c.rule(ink);

  const section = (label: string) => {
    c.gap(3);
    c.text(label.toUpperCase(), MARGIN, 11, { style: "bold", color: ink, gap: 15 });
  };

  if (data.basics.summary) {
    section("Summary");
    c.wrapped(data.basics.summary, MARGIN, 9.5, CONTENT_WIDTH);
    c.gap(6);
  }

  if (data.skills.length > 0) {
    section("Skills");
    for (const group of data.skills) {
      c.wrapped(`${group.name || "Skills"}: ${group.keywords.join(", ")}`, MARGIN, 9.5, CONTENT_WIDTH, { style: "normal" });
    }
    c.gap(6);
  }

  if (data.work.length > 0) {
    section("Experience");
    for (const job of data.work) {
      c.text(`${job.position || "Role"}  —  ${job.name || ""}`, MARGIN, 10.5, { style: "bold", gap: 12 });
      c.wrapped(dateRange(job.startDate, job.endDate), MARGIN, 9, CONTENT_WIDTH, { color: muted });
      for (const h of job.highlights) {
        c.wrapped(`• ${h}`, MARGIN + 4, 9.5, CONTENT_WIDTH - 4);
      }
      c.gap(6);
    }
  }

  if (data.projects.length > 0) {
    section("Projects");
    for (const project of data.projects) {
      c.text(project.name || "Project", MARGIN, 10.5, { style: "bold", gap: 12 });
      if (project.description) c.wrapped(project.description, MARGIN, 9.5, CONTENT_WIDTH);
      for (const h of project.highlights) {
        c.wrapped(`• ${h}`, MARGIN + 4, 9.5, CONTENT_WIDTH - 4);
      }
      c.gap(5);
    }
  }

  if (data.education.length > 0) {
    section("Education");
    for (const edu of data.education) {
      c.text(`${edu.studyType || "Degree"}${edu.area ? ` in ${edu.area}` : ""}  —  ${edu.institution || ""}`, MARGIN, 10, { style: "bold", gap: 12 });
      c.wrapped(`${dateRange(edu.startDate, edu.endDate)}${edu.score ? `   ${edu.score}` : ""}`, MARGIN, 9, CONTENT_WIDTH, { color: muted });
      c.gap(4);
    }
  }

  if (data.certificates.length > 0) {
    section("Certifications");
    for (const cert of data.certificates) {
      c.wrapped(`${cert.name}${cert.issuer ? ` — ${cert.issuer}` : ""}${cert.date ? ` (${cert.date})` : ""}`, MARGIN, 9.5, CONTENT_WIDTH);
    }
    c.gap(4);
  }

  if (data.awards.length > 0) {
    section("Achievements");
    for (const award of data.awards) {
      c.wrapped(`${award.title}${award.summary ? ` — ${award.summary}` : ""}`, MARGIN, 9.5, CONTENT_WIDTH);
    }
  }
}

export function generateResumePdf(data: ResumeData, templateId: ResumeTemplateId): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: [PAGE_WIDTH, PAGE_HEIGHT] });
  if (templateId === "modern-corporate") {
    buildModernCorporate(doc, data);
  } else {
    buildMinimalProfessional(doc, data);
  }
  return doc;
}

export function downloadResumePdf(data: ResumeData, templateId: ResumeTemplateId, fileNamePrefix = "resume") {
  const doc = generateResumePdf(data, templateId);
  const safeName = (data.basics.name || fileNamePrefix).trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`${safeName || fileNamePrefix}-${templateId}.pdf`);
}
