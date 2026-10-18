"use client";

import { Plus, Trash2 } from "lucide-react";
import { makeLocalId } from "@/lib/resume/empty";
import type {
  ResumeData,
  ResumeAward,
  ResumeCertificate,
  ResumeEducation,
  ResumeProfileLink,
  ResumeProject,
  ResumeSkillGroup,
  ResumeWork,
} from "@/lib/resume/types";
import BulletField from "./BulletField";

type Updater = (updater: (d: ResumeData) => ResumeData) => void;

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="font-body text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="font-body text-xs font-medium text-muted-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-1 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}

function SectionCard({ title, description, children, onAdd, addLabel }: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-headline text-lg text-foreground">{title}</h2>
          {description && <p className="mt-1 font-body text-xs text-muted-foreground">{description}</p>}
        </div>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="flex shrink-0 items-center gap-1 rounded-full border border-primary/30 px-3 py-1.5 font-body text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} /> {addLabel ?? "Add"}
          </button>
        )}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function RowCard({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="relative rounded-2xl border border-border bg-background/60 p-4">
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        title="Remove"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
      </button>
      <div className="grid gap-3 pr-8">{children}</div>
    </div>
  );
}

export function ResumeForm({ data, update }: { data: ResumeData; update: Updater }) {
  return (
    <div className="space-y-6">
      {/* Basics */}
      <SectionCard title="Personal info" description="Shown at the top of every template.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" value={data.basics.name} onChange={(v) => update((d) => ({ ...d, basics: { ...d.basics, name: v } }))} placeholder="Priya Sharma" />
          <Field label="Target role / headline" value={data.basics.label} onChange={(v) => update((d) => ({ ...d, basics: { ...d.basics, label: v } }))} placeholder="Final-year CS student" />
          <Field label="Email" type="email" value={data.basics.email} onChange={(v) => update((d) => ({ ...d, basics: { ...d.basics, email: v } }))} placeholder="you@college.edu.in" />
          <Field label="Phone" value={data.basics.phone} onChange={(v) => update((d) => ({ ...d, basics: { ...d.basics, phone: v } }))} placeholder="+91 90000 00000" />
          <Field label="Location" value={data.basics.location} onChange={(v) => update((d) => ({ ...d, basics: { ...d.basics, location: v } }))} placeholder="Hyderabad, India" />
        </div>
        <TextArea label="Summary" value={data.basics.summary} onChange={(v) => update((d) => ({ ...d, basics: { ...d.basics, summary: v } }))} placeholder="Two or three sentences on what you're looking for and what you bring." />

        <div className="space-y-2">
          <span className="font-body text-xs font-medium text-muted-foreground">Links (LinkedIn, GitHub, portfolio)</span>
          {data.basics.profiles.map((p: ResumeProfileLink) => (
            <div key={p.id} className="flex gap-2">
              <input
                value={p.network}
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    basics: { ...d.basics, profiles: d.basics.profiles.map((x) => (x.id === p.id ? { ...x, network: e.target.value } : x)) },
                  }))
                }
                placeholder="LinkedIn"
                className="w-32 rounded-xl border border-input bg-background px-3 py-2 font-body text-sm outline-none focus:border-primary"
              />
              <input
                value={p.url}
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    basics: { ...d.basics, profiles: d.basics.profiles.map((x) => (x.id === p.id ? { ...x, url: e.target.value } : x)) },
                  }))
                }
                placeholder="https://linkedin.com/in/..."
                className="flex-1 rounded-xl border border-input bg-background px-3 py-2 font-body text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => update((d) => ({ ...d, basics: { ...d.basics, profiles: d.basics.profiles.filter((x) => x.id !== p.id) } }))}
                className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              update((d) => ({ ...d, basics: { ...d.basics, profiles: [...d.basics.profiles, { id: makeLocalId(), network: "", url: "" }] } }))
            }
            className="flex items-center gap-1 font-body text-xs font-medium text-primary"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Add link
          </button>
        </div>
      </SectionCard>

      {/* Education */}
      <SectionCard
        title="Education"
        onAdd={() =>
          update((d) => ({
            ...d,
            education: [
              ...d.education,
              { id: makeLocalId(), institution: "", area: "", studyType: "", startDate: "", endDate: "", score: "" },
            ],
          }))
        }
        addLabel="Add education"
      >
        {data.education.length === 0 && <EmptyHint text="No education added yet." />}
        {data.education.map((edu: ResumeEducation) => {
          const set = (patch: Partial<ResumeEducation>) =>
            update((d) => ({ ...d, education: d.education.map((x) => (x.id === edu.id ? { ...x, ...patch } : x)) }));
          return (
            <RowCard key={edu.id} onRemove={() => update((d) => ({ ...d, education: d.education.filter((x) => x.id !== edu.id) }))}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Institution" value={edu.institution} onChange={(v) => set({ institution: v })} placeholder="IIT Hyderabad" />
                <Field label="Degree" value={edu.studyType} onChange={(v) => set({ studyType: v })} placeholder="B.Tech" />
                <Field label="Field of study" value={edu.area} onChange={(v) => set({ area: v })} placeholder="Computer Science" />
                <Field label="CGPA / score" value={edu.score} onChange={(v) => set({ score: v })} placeholder="8.7 CGPA" />
                <Field label="Start" value={edu.startDate} onChange={(v) => set({ startDate: v })} placeholder="2022" />
                <Field label="End (or expected)" value={edu.endDate} onChange={(v) => set({ endDate: v })} placeholder="2026" />
              </div>
            </RowCard>
          );
        })}
      </SectionCard>

      {/* Work experience */}
      <SectionCard
        title="Work experience"
        description="Internships count. Each bullet should read as action + result."
        onAdd={() =>
          update((d) => ({
            ...d,
            work: [...d.work, { id: makeLocalId(), name: "", position: "", startDate: "", endDate: "", summary: "", highlights: [] }],
          }))
        }
        addLabel="Add experience"
      >
        {data.work.length === 0 && <EmptyHint text="No experience added yet." />}
        {data.work.map((job: ResumeWork) => {
          const set = (patch: Partial<ResumeWork>) => update((d) => ({ ...d, work: d.work.map((x) => (x.id === job.id ? { ...x, ...patch } : x)) }));
          return (
            <RowCard key={job.id} onRemove={() => update((d) => ({ ...d, work: d.work.filter((x) => x.id !== job.id) }))}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Company" value={job.name} onChange={(v) => set({ name: v })} placeholder="Acme Corp" />
                <Field label="Role" value={job.position} onChange={(v) => set({ position: v })} placeholder="Software Engineering Intern" />
                <Field label="Start" value={job.startDate} onChange={(v) => set({ startDate: v })} placeholder="May 2025" />
                <Field label="End" value={job.endDate} onChange={(v) => set({ endDate: v })} placeholder="Jul 2025" />
              </div>
              <div className="space-y-2">
                <span className="font-body text-xs font-medium text-muted-foreground">Bullets</span>
                {job.highlights.map((h, i) => (
                  <BulletField
                    key={i}
                    value={h}
                    onChange={(v) => set({ highlights: job.highlights.map((x, idx) => (idx === i ? v : x)) })}
                    onRemove={() => set({ highlights: job.highlights.filter((_, idx) => idx !== i) })}
                  />
                ))}
                <button type="button" onClick={() => set({ highlights: [...job.highlights, ""] })} className="flex items-center gap-1 font-body text-xs font-medium text-primary">
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Add bullet
                </button>
              </div>
            </RowCard>
          );
        })}
      </SectionCard>

      {/* Projects */}
      <SectionCard
        title="Projects"
        onAdd={() =>
          update((d) => ({
            ...d,
            projects: [...d.projects, { id: makeLocalId(), name: "", description: "", url: "", keywords: [], highlights: [] }],
          }))
        }
        addLabel="Add project"
      >
        {data.projects.length === 0 && <EmptyHint text="No projects added yet." />}
        {data.projects.map((project: ResumeProject) => {
          const set = (patch: Partial<ResumeProject>) =>
            update((d) => ({ ...d, projects: d.projects.map((x) => (x.id === project.id ? { ...x, ...patch } : x)) }));
          return (
            <RowCard key={project.id} onRemove={() => update((d) => ({ ...d, projects: d.projects.filter((x) => x.id !== project.id) }))}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Project name" value={project.name} onChange={(v) => set({ name: v })} placeholder="Placement readiness tracker" />
                <Field label="Link (optional)" value={project.url} onChange={(v) => set({ url: v })} placeholder="https://github.com/..." />
              </div>
              <TextArea label="Description" value={project.description} onChange={(v) => set({ description: v })} rows={2} placeholder="What it does and why you built it." />
              <Field
                label="Technologies (comma separated)"
                value={project.keywords.join(", ")}
                onChange={(v) => set({ keywords: v.split(",").map((s) => s.trim()).filter(Boolean) })}
                placeholder="React, Supabase, Tailwind"
              />
              <div className="space-y-2">
                <span className="font-body text-xs font-medium text-muted-foreground">Bullets</span>
                {project.highlights.map((h, i) => (
                  <BulletField
                    key={i}
                    value={h}
                    onChange={(v) => set({ highlights: project.highlights.map((x, idx) => (idx === i ? v : x)) })}
                    onRemove={() => set({ highlights: project.highlights.filter((_, idx) => idx !== i) })}
                  />
                ))}
                <button type="button" onClick={() => set({ highlights: [...project.highlights, ""] })} className="flex items-center gap-1 font-body text-xs font-medium text-primary">
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Add bullet
                </button>
              </div>
            </RowCard>
          );
        })}
      </SectionCard>

      {/* Skills */}
      <SectionCard
        title="Skills"
        description="Group skills by category, e.g. Languages, Tools, Soft skills."
        onAdd={() => update((d) => ({ ...d, skills: [...d.skills, { id: makeLocalId(), name: "", keywords: [] }] }))}
        addLabel="Add category"
      >
        {data.skills.length === 0 && <EmptyHint text="No skill categories added yet." />}
        {data.skills.map((group: ResumeSkillGroup) => {
          const set = (patch: Partial<ResumeSkillGroup>) => update((d) => ({ ...d, skills: d.skills.map((x) => (x.id === group.id ? { ...x, ...patch } : x)) }));
          return (
            <RowCard key={group.id} onRemove={() => update((d) => ({ ...d, skills: d.skills.filter((x) => x.id !== group.id) }))}>
              <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <Field label="Category" value={group.name} onChange={(v) => set({ name: v })} placeholder="Languages" />
                <Field
                  label="Skills (comma separated)"
                  value={group.keywords.join(", ")}
                  onChange={(v) => set({ keywords: v.split(",").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="Python, SQL, JavaScript"
                />
              </div>
            </RowCard>
          );
        })}
      </SectionCard>

      {/* Certifications */}
      <SectionCard
        title="Certifications"
        onAdd={() => update((d) => ({ ...d, certificates: [...d.certificates, { id: makeLocalId(), name: "", issuer: "", date: "", url: "" }] }))}
        addLabel="Add certification"
      >
        {data.certificates.length === 0 && <EmptyHint text="No certifications added yet." />}
        {data.certificates.map((cert: ResumeCertificate) => {
          const set = (patch: Partial<ResumeCertificate>) => update((d) => ({ ...d, certificates: d.certificates.map((x) => (x.id === cert.id ? { ...x, ...patch } : x)) }));
          return (
            <RowCard key={cert.id} onRemove={() => update((d) => ({ ...d, certificates: d.certificates.filter((x) => x.id !== cert.id) }))}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Name" value={cert.name} onChange={(v) => set({ name: v })} placeholder="AWS Certified Cloud Practitioner" />
                <Field label="Issuer" value={cert.issuer} onChange={(v) => set({ issuer: v })} placeholder="Amazon Web Services" />
                <Field label="Date" value={cert.date} onChange={(v) => set({ date: v })} placeholder="2025" />
              </div>
            </RowCard>
          );
        })}
      </SectionCard>

      {/* Achievements */}
      <SectionCard
        title="Achievements"
        onAdd={() => update((d) => ({ ...d, awards: [...d.awards, { id: makeLocalId(), title: "", date: "", awarder: "", summary: "" }] }))}
        addLabel="Add achievement"
      >
        {data.awards.length === 0 && <EmptyHint text="No achievements added yet." />}
        {data.awards.map((award: ResumeAward) => {
          const set = (patch: Partial<ResumeAward>) => update((d) => ({ ...d, awards: d.awards.map((x) => (x.id === award.id ? { ...x, ...patch } : x)) }));
          return (
            <RowCard key={award.id} onRemove={() => update((d) => ({ ...d, awards: d.awards.filter((x) => x.id !== award.id) }))}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Title" value={award.title} onChange={(v) => set({ title: v })} placeholder="Winner, Smart India Hackathon" />
                <Field label="Date" value={award.date} onChange={(v) => set({ date: v })} placeholder="2025" />
              </div>
              <TextArea label="Details (optional)" value={award.summary} onChange={(v) => set({ summary: v })} rows={2} />
            </RowCard>
          );
        })}
      </SectionCard>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center font-body text-sm text-muted-foreground">{text}</p>;
}

export default ResumeForm;
