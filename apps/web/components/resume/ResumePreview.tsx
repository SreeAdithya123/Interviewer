import type { ResumeData, ResumeTemplateId } from "@/lib/resume/types";

/**
 * On-screen live preview, styled to track the two PDF templates
 * (lib/resume/pdf.ts) closely enough that "what you see is what you
 * export" — not a pixel-identical render of the generated PDF.
 */
export function ResumePreview({ data, templateId }: { data: ResumeData; templateId: ResumeTemplateId }) {
  if (templateId === "modern-corporate") {
    return <ModernCorporatePreview data={data} />;
  }
  return <MinimalProfessionalPreview data={data} />;
}

function ContactLine({ data }: { data: ResumeData }) {
  const parts = [data.basics.email, data.basics.phone, data.basics.location, ...data.basics.profiles.map((p) => p.url).filter(Boolean)].filter(Boolean);
  if (parts.length === 0) return null;
  return <p className="text-[11px] text-gray-500">{parts.join("   ·   ")}</p>;
}

function MinimalProfessionalPreview({ data }: { data: ResumeData }) {
  return (
    <div className="aspect-[8.5/11] w-full overflow-y-auto bg-white p-8 text-gray-800 font-resume-body">
      <h1 className="font-resume-heading text-2xl font-semibold" style={{ color: "#1e3a5f" }}>
        {data.basics.name || "Your Name"}
      </h1>
      {data.basics.label && <p className="mt-0.5 text-sm text-gray-500">{data.basics.label}</p>}
      <div className="mt-2 border-b border-gray-200 pb-3">
        <ContactLine data={data} />
      </div>

      {data.basics.summary && <p className="mt-4 text-[13px] italic leading-relaxed text-gray-600">{data.basics.summary}</p>}

      {data.work.length > 0 && (
        <PreviewSection label="Experience" color="#1e3a5f">
          <div className="space-y-3">
            {data.work.map((job) => (
              <div key={job.id} className="border-l-2 pl-3" style={{ borderColor: "#3b82f6" }}>
                <div className="flex justify-between text-[13px]">
                  <span className="font-medium" style={{ color: "#1e3a5f" }}>{job.position || "Role"}</span>
                  <span className="text-[11px] text-gray-400">{[job.startDate, job.endDate].filter(Boolean).join(" – ")}</span>
                </div>
                <p className="text-[12px] text-gray-500">{job.name}</p>
                <ul className="mt-1 space-y-0.5">
                  {job.highlights.filter(Boolean).map((h, i) => (
                    <li key={i} className="text-[12px] text-gray-600">&mdash; {h}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </PreviewSection>
      )}

      {data.education.length > 0 && (
        <PreviewSection label="Education" color="#1e3a5f">
          <div className="space-y-2">
            {data.education.map((edu) => (
              <div key={edu.id} className="flex justify-between text-[12px]">
                <div>
                  <p className="font-medium" style={{ color: "#1e3a5f" }}>{edu.studyType}{edu.area ? ` in ${edu.area}` : ""}</p>
                  <p className="text-gray-500">{edu.institution}</p>
                </div>
                <div className="text-right text-[11px] text-gray-400">
                  <p>{[edu.startDate, edu.endDate].filter(Boolean).join(" – ")}</p>
                  {edu.score && <p>{edu.score}</p>}
                </div>
              </div>
            ))}
          </div>
        </PreviewSection>
      )}

      {data.skills.length > 0 && (
        <PreviewSection label="Skills" color="#1e3a5f">
          <div className="flex flex-wrap gap-1.5">
            {data.skills.flatMap((g) => g.keywords).map((skill, i) => (
              <span key={i} className="rounded-full px-2 py-0.5 text-[11px]" style={{ backgroundColor: "#3b82f615", color: "#1e3a5f" }}>{skill}</span>
            ))}
          </div>
        </PreviewSection>
      )}

      {data.projects.length > 0 && (
        <PreviewSection label="Projects" color="#1e3a5f">
          <div className="space-y-2">
            {data.projects.map((p) => (
              <div key={p.id}>
                <p className="text-[13px] font-medium" style={{ color: "#1e3a5f" }}>{p.name}</p>
                <p className="text-[12px] text-gray-600">{p.description}</p>
              </div>
            ))}
          </div>
        </PreviewSection>
      )}
    </div>
  );
}

function ModernCorporatePreview({ data }: { data: ResumeData }) {
  return (
    <div className="aspect-[8.5/11] w-full overflow-y-auto bg-white p-8 text-gray-900 font-resume-body">
      <div className="border-b-2 pb-4" style={{ borderColor: "#2563eb" }}>
        <h1 className="font-resume-heading text-2xl font-bold" style={{ color: "#2563eb" }}>
          {data.basics.name || "Your Name"}
        </h1>
        {data.basics.label && <p className="mt-0.5 text-sm font-semibold" style={{ color: "#2563eb" }}>{data.basics.label}</p>}
        <div className="mt-1.5"><ContactLine data={data} /></div>
      </div>

      {data.basics.summary && (
        <PreviewSection label="Professional summary" color="#2563eb" upper>
          <p className="text-[13px] text-gray-700">{data.basics.summary}</p>
        </PreviewSection>
      )}

      {data.skills.length > 0 && (
        <PreviewSection label="Skills" color="#2563eb" upper>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            {data.skills.map((g) => (
              <p key={g.id}><span className="font-medium">{g.name}:</span> <span className="text-gray-600">{g.keywords.join(", ")}</span></p>
            ))}
          </div>
        </PreviewSection>
      )}

      {data.work.length > 0 && (
        <PreviewSection label="Experience" color="#2563eb" upper>
          <div className="space-y-3">
            {data.work.map((job) => (
              <div key={job.id}>
                <div className="flex justify-between text-[13px]">
                  <span className="font-semibold">{job.position} &mdash; {job.name}</span>
                  <span className="text-gray-500">{[job.startDate, job.endDate].filter(Boolean).join(" – ")}</span>
                </div>
                <ul className="mt-1 space-y-0.5 text-[12px] text-gray-700">
                  {job.highlights.filter(Boolean).map((h, i) => (
                    <li key={i}>&bull; {h}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </PreviewSection>
      )}

      {data.projects.length > 0 && (
        <PreviewSection label="Projects" color="#2563eb" upper>
          <div className="space-y-2">
            {data.projects.map((p) => (
              <div key={p.id}>
                <p className="text-[13px] font-semibold">{p.name}</p>
                <p className="text-[12px] text-gray-700">{p.description}</p>
              </div>
            ))}
          </div>
        </PreviewSection>
      )}

      {data.education.length > 0 && (
        <PreviewSection label="Education" color="#2563eb" upper>
          <div className="space-y-1.5">
            {data.education.map((edu) => (
              <div key={edu.id} className="flex justify-between text-[12px]">
                <div>
                  <p className="font-semibold">{edu.studyType}{edu.area ? ` in ${edu.area}` : ""}</p>
                  <p className="text-gray-600">{edu.institution}</p>
                </div>
                <p className="text-gray-500">{[edu.startDate, edu.endDate].filter(Boolean).join(" – ")}</p>
              </div>
            ))}
          </div>
        </PreviewSection>
      )}
    </div>
  );
}

function PreviewSection({ label, color, upper, children }: { label: string; color: string; upper?: boolean; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h2 className={`mb-2 font-resume-heading text-[11px] font-semibold tracking-widest ${upper ? "uppercase" : "uppercase"}`} style={{ color }}>
        {label}
      </h2>
      {children}
    </div>
  );
}

export default ResumePreview;
