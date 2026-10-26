"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Mic,
  BookOpen,
  Briefcase,
  FileText,
  MessageSquare,
  Clock,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Zap,
  Target,
  Brain,
  Upload,
  Check,
  Lock,
  Camera,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   Tour content: one "section" per major student feature/page.
   Each section has a title, icon, accent colour, and exactly 5 cards.
───────────────────────────────────────────────────────────────────────────── */
export interface TourCard {
  icon: React.ReactNode;
  headline: string;
  body: string;
  tip?: string;
}

export interface TourSection {
  id: string;
  label: string;
  /** Tailwind colour token used for the section accent (w/o "text-" prefix) */
  accent: string;
  /** Background colour of the section chip */
  chipBg: string;
  icon: React.ReactNode;
  cards: TourCard[];
}

const TOUR_SECTIONS: TourSection[] = [
  // ─── 1. AI Mock Interview ──────────────────────────────────────────────────
  {
    id: "interview",
    label: "AI Mock Interview",
    accent: "text-violet-600 dark:text-violet-400",
    chipBg: "bg-violet-50 dark:bg-violet-950/40 border-violet-200/60 dark:border-violet-800/40",
    icon: <Mic className="h-5 w-5" />,
    cards: [
      {
        icon: <Sparkles className="h-8 w-8 text-violet-500" />,
        headline: "Simulate real placement interviews",
        body:
          "Practice Technical, HR, or Domain rounds with an AI interviewer that adapts difficulty based on your performance. It speaks, you speak — just like the real thing.",
        tip: "Tip: Choose a specific role like 'Software Engineer – Product' for the most targeted questions.",
      },
      {
        icon: <Mic className="h-8 w-8 text-violet-500" />,
        headline: "Voice-first interview experience",
        body:
          "Answer questions out loud. The platform captures your voice, analyses clarity, pace, and confidence in real time. No typing — speak like you would in the room.",
        tip: "Tip: Use a quiet environment and plug in headphones for the best audio quality.",
      },
      {
        icon: <Lock className="h-8 w-8 text-violet-500" />,
        headline: "Secure lock-screen proctoring",
        body:
          "Before each session, a pre-flight check verifies your internet, camera, microphone, and identity. Lock-screen mode prevents tab-switching so the environment mirrors an actual interview.",
        tip: "Tip: Allow camera and microphone permissions when prompted — they're required to start.",
      },
      {
        icon: <BarChart3 className="h-8 w-8 text-violet-500" />,
        headline: "Instant AI-scored reports",
        body:
          "After every session you get a detailed report: overall score out of 100, per-question feedback, communication analysis, and a list of improvement areas to work on.",
        tip: "Tip: Read the 'Weak areas' section carefully — the AI Coach can build you a practice plan from it.",
      },
      {
        icon: <Target className="h-8 w-8 text-violet-500" />,
        headline: "Track your readiness score",
        body:
          "Every completed session updates your Readiness Score on the dashboard. Aim for 75+ before applying to campus drives — that's the benchmark Vyoman recommends.",
        tip: "Tip: Attempt at least 3 mocks in different tracks to get a reliable multi-dimensional score.",
      },
    ],
  },

  // ─── 2. Career Blueprints ──────────────────────────────────────────────────
  {
    id: "blueprints",
    label: "Career Blueprints",
    accent: "text-sky-600 dark:text-sky-400",
    chipBg: "bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-800/40",
    icon: <BookOpen className="h-5 w-5" />,
    cards: [
      {
        icon: <BookOpen className="h-8 w-8 text-sky-500" />,
        headline: "Your personalised placement roadmap",
        body:
          "A Career Blueprint is a step-by-step prep plan generated for your target role — covering skills to learn, topics to revise, and milestones to hit before drive season.",
        tip: "Tip: Create a blueprint as soon as you join. It gives every other tool a shared direction.",
      },
      {
        icon: <Brain className="h-8 w-8 text-sky-500" />,
        headline: "AI-generated, personalised to you",
        body:
          "Blueprints are not generic. The AI analyses your profile, your interview history, and your weak areas to create a plan that fills exactly the gaps you have.",
        tip: "Tip: Update your target role whenever it changes — the blueprint will regenerate to match.",
      },
      {
        icon: <Target className="h-8 w-8 text-sky-500" />,
        headline: "Milestone-driven progress tracking",
        body:
          "Each blueprint breaks down into weekly milestones. As you practice and complete mocks, your progress auto-updates. You always know what to do next.",
        tip: "Tip: Check your blueprint every Monday morning to plan the week's practice sessions.",
      },
      {
        icon: <Zap className="h-8 w-8 text-sky-500" />,
        headline: "Connected to the AI Coach",
        body:
          "Every blueprint milestone links directly to the AI Coach chat. Stuck on a concept? Click 'Ask AI' on any milestone and get an instant explanation or practice drill.",
        tip: "Tip: Use the AI Coach to deep-dive on any skill your blueprint flags as critical.",
      },
      {
        icon: <BarChart3 className="h-8 w-8 text-sky-500" />,
        headline: "Multiple role blueprints",
        body:
          "Unsure between Software Engineer and Data Analyst? Create separate blueprints for both and compare the skill overlaps. Focus on the shared core first.",
        tip: "Tip: Up to 3 active blueprints allowed simultaneously — one per target company tier.",
      },
    ],
  },

  // ─── 3. Placement Drives ──────────────────────────────────────────────────
  {
    id: "drives",
    label: "Placement Drives",
    accent: "text-emerald-600 dark:text-emerald-400",
    chipBg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40",
    icon: <Briefcase className="h-5 w-5" />,
    cards: [
      {
        icon: <Briefcase className="h-8 w-8 text-emerald-500" />,
        headline: "Browse active campus drives",
        body:
          "All placement drives posted by your college appear here — company name, role, CTC, eligibility cutoffs, and application deadlines in one view.",
        tip: "Tip: Sort by 'Deadline' to prioritise the drives closing soon.",
      },
      {
        icon: <Check className="h-8 w-8 text-emerald-500" />,
        headline: "Check eligibility in one click",
        body:
          "Vyoman automatically compares a drive's CGPA, backlog, and branch requirements against your profile and tells you whether you are eligible before you apply.",
        tip: "Tip: Keep your profile CGPA updated so eligibility checks are accurate.",
      },
      {
        icon: <Target className="h-8 w-8 text-emerald-500" />,
        headline: "Company-specific prep mode",
        body:
          "Each drive card links to a focused prep section — company overview, question patterns from previous batches, and an option to launch a company-specific mock interview.",
        tip: "Tip: Do at least one company-specific mock before you attend the actual drive.",
      },
      {
        icon: <Zap className="h-8 w-8 text-emerald-500" />,
        headline: "Track your drive applications",
        body:
          "Once you apply, the drive moves to 'Applied' status with key dates — online test, group discussion, and interview rounds — displayed as a timeline.",
        tip: "Tip: Enable browser notifications so you never miss an upcoming round alert.",
      },
      {
        icon: <BarChart3 className="h-8 w-8 text-emerald-500" />,
        headline: "Readiness gate before you apply",
        body:
          "Drives can have a Readiness Score gate — if a company requires 70+, Vyoman will show a warning if you're below it and suggest which mocks to complete first.",
        tip: "Tip: Prioritise mocks over applications. Getting offers > just applying.",
      },
    ],
  },

  // ─── 4. Resume Builder & Scanner ─────────────────────────────────────────
  {
    id: "resume",
    label: "Resume Builder & ATS Scanner",
    accent: "text-amber-600 dark:text-amber-400",
    chipBg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40",
    icon: <FileText className="h-5 w-5" />,
    cards: [
      {
        icon: <FileText className="h-8 w-8 text-amber-500" />,
        headline: "Build an ATS-optimised resume",
        body:
          "The Resume Builder guides you through every section — education, experience, projects, skills — and formats your resume to pass Applicant Tracking Systems that screen candidates automatically.",
        tip: "Tip: Use the same keywords from the job description in your skills and experience sections.",
      },
      {
        icon: <Upload className="h-8 w-8 text-amber-500" />,
        headline: "Scan any existing resume",
        body:
          "Already have a resume? Upload it to the ATS Scanner and get an instant compatibility score with actionable fixes — missing keywords, weak action verbs, formatting issues.",
        tip: "Tip: Scan your resume against a specific job description for the highest accuracy.",
      },
      {
        icon: <Brain className="h-8 w-8 text-amber-500" />,
        headline: "AI rewrites weak bullet points",
        body:
          "Paste in a weak bullet like 'Worked on database' and the AI rewrites it as a strong, metric-driven statement — 'Optimised PostgreSQL queries, reducing report load time by 40%'.",
        tip: "Tip: Always quantify impact — numbers make bullet points 3× more memorable to recruiters.",
      },
      {
        icon: <Check className="h-8 w-8 text-amber-500" />,
        headline: "Multiple versions for different roles",
        body:
          "Save different resume versions for different roles — a backend-focused version for product companies and a data-focused version for analytics roles, all in one place.",
        tip: "Tip: Name each version clearly (e.g., 'SDE – Backend – Oct 2025') so you never send the wrong one.",
      },
      {
        icon: <Zap className="h-8 w-8 text-amber-500" />,
        headline: "One-click export to PDF",
        body:
          "When your resume is ready, export it as a clean, professional PDF. No design skills needed — Vyoman's template is built to print perfectly and look great on screen.",
        tip: "Tip: Export a fresh PDF before every application — last-minute edits are easy and free.",
      },
    ],
  },

  // ─── 5. AI Coach (Chat) ───────────────────────────────────────────────────
  {
    id: "chat",
    label: "AI Coach",
    accent: "text-rose-600 dark:text-rose-400",
    chipBg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/40",
    icon: <MessageSquare className="h-5 w-5" />,
    cards: [
      {
        icon: <MessageSquare className="h-8 w-8 text-rose-500" />,
        headline: "Your always-on placement mentor",
        body:
          "The AI Coach answers placement questions 24/7 — DSA concepts, HR tips, company research, salary negotiation, offer comparisons. Ask anything you'd ask a senior or mentor.",
        tip: "Tip: Be specific. 'How do I answer 'Tell me about yourself' for a product startup?' beats 'Help with interviews'.",
      },
      {
        icon: <Brain className="h-8 w-8 text-rose-500" />,
        headline: "Context-aware from your history",
        body:
          "The AI Coach knows your weak areas, your blueprint, and your past interview scores. When you ask for help, it tailors advice to exactly where you stand — not generic advice.",
        tip: "Tip: Start with 'Based on my weak areas, what should I practice today?' for a personalised drill.",
      },
      {
        icon: <Target className="h-8 w-8 text-rose-500" />,
        headline: "Practice drills on demand",
        body:
          "Ask for 5 DSA problems on binary trees or 3 system design questions at medium difficulty. The AI generates fresh problems and evaluates your answers conversationally.",
        tip: "Tip: After a mock interview, paste a question you struggled with and ask for a model answer.",
      },
      {
        icon: <Zap className="h-8 w-8 text-rose-500" />,
        headline: "Interview script feedback",
        body:
          "Type or paste what you plan to say for 'Tell me about yourself' or 'Why this company?' The AI scores it and gives a rewritten version that's sharper and more compelling.",
        tip: "Tip: Rehearse your intro answer with the AI 3–4 times until you get a 9/10 score.",
      },
      {
        icon: <Sparkles className="h-8 w-8 text-rose-500" />,
        headline: "Powered by Vyoman's knowledge base",
        body:
          "The coach is grounded in real placement data from your campus, company-specific interview patterns, and the Vyoman question bank — not just generic internet content.",
        tip: "Tip: Ask 'What did students from my college face in TCS NQT last season?' for targeted intel.",
      },
    ],
  },

  // ─── 6. History & Reports ─────────────────────────────────────────────────
  {
    id: "history",
    label: "Interview History",
    accent: "text-indigo-600 dark:text-indigo-400",
    chipBg: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/60 dark:border-indigo-800/40",
    icon: <Clock className="h-5 w-5" />,
    cards: [
      {
        icon: <Clock className="h-8 w-8 text-indigo-500" />,
        headline: "Your complete interview archive",
        body:
          "Every mock interview you've ever taken — completed, paused, or in progress — is stored here with date, role, difficulty, and your score. Nothing is ever deleted.",
        tip: "Tip: Filter by 'HR' or 'Technical' to review a specific track before an upcoming round.",
      },
      {
        icon: <BarChart3 className="h-8 w-8 text-indigo-500" />,
        headline: "Deep-dive score reports",
        body:
          "Each completed session has a full report: per-question scores, AI commentary on each answer, overall communication score, and a summary of strengths and weak areas.",
        tip: "Tip: Re-read old reports every 2 weeks to measure how much you've improved.",
      },
      {
        icon: <Brain className="h-8 w-8 text-indigo-500" />,
        headline: "Score trend over time",
        body:
          "The history page charts your readiness score across all sessions. Watch your trend line rise as you practice — use it as motivation and to spot plateaus early.",
        tip: "Tip: A flat trend line means you need to try harder questions, not just more of the same.",
      },
      {
        icon: <Target className="h-8 w-8 text-indigo-500" />,
        headline: "Weak area evolution",
        body:
          "Weak areas marked in old sessions are compared with recent ones. If 'Data Structures' was flagged 3 sessions ago but not today, you can see the improvement clearly.",
        tip: "Tip: Focus your AI Coach sessions on areas that appear in 3+ consecutive interview reports.",
      },
      {
        icon: <Zap className="h-8 w-8 text-indigo-500" />,
        headline: "Resume your session anytime",
        body:
          "Interrupted during a mock? Sessions in 'In Progress' status can be resumed later from exactly where you left off — your answers and the AI's context are preserved.",
        tip: "Tip: Always formally complete a session rather than just closing the tab, so the score is counted.",
      },
    ],
  },

  // ─── 7. Profile & ID Verification ────────────────────────────────────────
  {
    id: "profile",
    label: "Profile & Identity Verification",
    accent: "text-teal-600 dark:text-teal-400",
    chipBg: "bg-teal-50 dark:bg-teal-950/40 border-teal-200/60 dark:border-teal-800/40",
    icon: <ShieldCheck className="h-5 w-5" />,
    cards: [
      {
        icon: <ShieldCheck className="h-8 w-8 text-teal-500" />,
        headline: "Your verified placement identity",
        body:
          "The profile page stores your personal details, academic information, target roles, and your biometric identity photo used to verify you are the same person in every interview.",
        tip: "Tip: Complete your profile 100% — incomplete profiles flag for review in college admin dashboards.",
      },
      {
        icon: <Camera className="h-8 w-8 text-teal-500" />,
        headline: "Biometric photo registration",
        body:
          "Upload a clear front-facing photo to register your face. Vyoman uses this to verify your identity at the start of every interview using secure on-device AI — no photo is stored on external servers.",
        tip: "Tip: Use a well-lit, straight-on photo with no glasses for the highest verification accuracy.",
      },
      {
        icon: <Lock className="h-8 w-8 text-teal-500" />,
        headline: "Face verified at every session",
        body:
          "Before each mock interview, the pre-flight check compares your live camera feed with your registered photo using AI-powered facial embedding. Mismatches are flagged to your college admin.",
        tip: "Tip: If verification fails, re-upload your photo in better lighting from the Profile page.",
      },
      {
        icon: <Check className="h-8 w-8 text-teal-500" />,
        headline: "Edit your info anytime",
        body:
          "Update your CGPA, branch, graduation year, target roles, and bio at any time from the Profile page. Changes immediately reflect in drive eligibility checks and blueprint personalisation.",
        tip: "Tip: Keep your CGPA updated after every semester — it directly affects drive eligibility.",
      },
      {
        icon: <Sparkles className="h-8 w-8 text-teal-500" />,
        headline: "✓ ID Verified badge",
        body:
          "Once your face is registered and your first session verified, you earn the '✓ ID Verified' badge on your sidebar. This signals to recruiters and admins that your interview scores are authentic.",
        tip: "Tip: The ID Verified badge is a trust signal — some drives require it to submit your application.",
      },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Progress dots
───────────────────────────────────────────────────────────────────────────── */
function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5" role="tablist" aria-label="Tour progress">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          role="tab"
          aria-selected={i === current}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current
              ? "w-5 bg-foreground"
              : i < current
              ? "w-1.5 bg-foreground/40"
              : "w-1.5 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Section pill selector
───────────────────────────────────────────────────────────────────────────── */
function SectionSelector({
  sections,
  active,
  onSelect,
}: {
  sections: TourSection[];
  active: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 px-6 pt-2 pb-1">
      {sections.map((s, i) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(i)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium border transition-all ${
            i === active
              ? `${s.chipBg} ${s.accent} border-current/20`
              : "bg-muted/60 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <span className={i === active ? s.accent : ""}>{s.icon}</span>
          {s.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main PlatformTour modal
───────────────────────────────────────────────────────────────────────────── */
interface PlatformTourProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optionally jump directly to a section by id */
  initialSectionId?: string;
}

export function PlatformTour({ isOpen, onClose, initialSectionId }: PlatformTourProps) {
  const initialSectionIdx = initialSectionId
    ? Math.max(
        0,
        TOUR_SECTIONS.findIndex((s) => s.id === initialSectionId)
      )
    : 0;

  const [sectionIdx, setSectionIdx] = useState(initialSectionIdx);
  const [cardIdx, setCardIdx] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const section = TOUR_SECTIONS[sectionIdx];
  const card = section.cards[cardIdx];
  const isFirstCard = cardIdx === 0;
  const isLastCard = cardIdx === section.cards.length - 1;
  const isLastSection = sectionIdx === TOUR_SECTIONS.length - 1;

  // Reset card when section changes
  useEffect(() => {
    setCardIdx(0);
  }, [sectionIdx]);

  // Re-apply initial section when opened
  useEffect(() => {
    if (isOpen) {
      setSectionIdx(initialSectionIdx);
      setCardIdx(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Focus trap + Escape key
  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, cardIdx, sectionIdx]);

  if (!isOpen) return null;

  function handleNext() {
    if (!isLastCard) {
      setCardIdx((c) => c + 1);
    } else if (!isLastSection) {
      setSectionIdx((s) => s + 1);
      setCardIdx(0);
    } else {
      onClose();
    }
  }

  function handlePrev() {
    if (!isFirstCard) {
      setCardIdx((c) => c - 1);
    } else if (sectionIdx > 0) {
      setSectionIdx((s) => s - 1);
      setCardIdx(TOUR_SECTIONS[sectionIdx - 1].cards.length - 1);
    }
  }

  function handleSectionSelect(i: number) {
    setSectionIdx(i);
    setCardIdx(0);
  }

  const totalSections = TOUR_SECTIONS.length;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Platform tour"
    >
      {/* Blur backdrop */}
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-2xl rounded-2xl border border-border/80 bg-background shadow-2xl shadow-black/10 dark:shadow-black/40 flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/[0.07]">
              <Sparkles className="h-3.5 w-3.5 text-foreground" />
            </div>
            <div>
              <p className="font-headline text-sm font-semibold text-foreground leading-none">
                Platform Tour
              </p>
              <p className="font-body text-[11px] text-muted-foreground mt-0.5">
                {totalSections} features · 5 cards each
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close tour"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Section Tabs ── */}
        <div className="overflow-x-auto border-b border-border/60">
          <SectionSelector
            sections={TOUR_SECTIONS}
            active={sectionIdx}
            onSelect={handleSectionSelect}
          />
        </div>

        {/* ── Card Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
          {/* Section label */}
          <div className="flex items-center gap-2 mb-5">
            <span className={`${section.accent}`}>{section.icon}</span>
            <span className={`font-body text-xs font-semibold uppercase tracking-widest ${section.accent}`}>
              {section.label}
            </span>
          </div>

          {/* Card content — animated fade */}
          <div
            key={`${sectionIdx}-${cardIdx}`}
            className="animate-fade-in"
          >
            {/* Large feature icon */}
            <div className="mb-4 flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/60 border border-border/60">
              {card.icon}
            </div>

            {/* Card number */}
            <p className="font-body text-[11px] font-medium text-muted-foreground mb-1">
              Card {cardIdx + 1} of {section.cards.length}
            </p>

            {/* Headline */}
            <h2 className="font-headline text-xl font-semibold text-foreground leading-snug mb-3">
              {card.headline}
            </h2>

            {/* Body */}
            <p className="font-body text-sm text-muted-foreground leading-relaxed mb-4">
              {card.body}
            </p>

            {/* Tip callout */}
            {card.tip && (
              <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                <p className="font-body text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">💡 </span>
                  {card.tip}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer Navigation ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-muted/20">
          {/* Progress dots */}
          <ProgressDots total={section.cards.length} current={cardIdx} />

          {/* Prev / Next */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={isFirstCard && sectionIdx === 0}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-background text-foreground transition-colors hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Previous card"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-xs font-medium transition-colors ${
                isLastCard && isLastSection
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "bg-foreground text-background hover:bg-foreground/90"
              }`}
              aria-label={isLastCard && isLastSection ? "Finish tour" : "Next card"}
            >
              {isLastCard && isLastSection ? (
                <>
                  Finish <Check className="h-3.5 w-3.5" />
                </>
              ) : isLastCard ? (
                <>
                  Next feature <ChevronRight className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { TOUR_SECTIONS };
export default PlatformTour;
