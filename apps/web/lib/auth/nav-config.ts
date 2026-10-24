import type { ProfileRole } from "@/lib/auth/current-profile";

export interface NavItem {
  label: string;
  href: string;
}

// Per docs/BUILD_SPEC.md Part 4.1's nav spec: "student: Interview, Resume,
// Chat, History; college_admin: + Students, Invites; platform_admin: +
// Colleges, Plans, Question Bank, Knowledge Base, Cost Dashboard, Golden
// Set". Read as cumulative by role: a college_admin sees everything a
// student does plus their own two links, and a platform_admin sees
// everything a college_admin does plus their own six (Part 4.8).
//
// HOW OTHER AGENTS ADD A NAV LINK: when you build a page under
// app/app/<segment>/page.tsx, add exactly one { label, href } entry to the
// array for the role(s) that should see it, below, with href
// `/app/<segment>` — do not hand-roll a separate sidebar/nav in your own
// page. If a brand-new role-specific section doesn't fit any array below,
// append it to the right one; don't introduce a second nav config file.
const STUDENT_NAV: NavItem[] = [
  { label: "Interview", href: "/app/interview" },
  { label: "Blueprints", href: "/app/blueprints" },
  { label: "Drives", href: "/app/drives" },
  { label: "Resume", href: "/app/resume" },
  { label: "Chat", href: "/app/chat" },
  { label: "History", href: "/app/history" },
];

const COLLEGE_ADMIN_NAV: NavItem[] = [
  ...STUDENT_NAV,
  { label: "Students", href: "/app/students" },
  { label: "Invites", href: "/app/invites" },
];

const PLATFORM_ADMIN_NAV: NavItem[] = [
  ...COLLEGE_ADMIN_NAV,
  { label: "Colleges", href: "/app/colleges" },
  { label: "Plans", href: "/app/plans" },
  { label: "Question Bank", href: "/app/question-bank" },
  { label: "Knowledge Base", href: "/app/knowledge-base" },
  { label: "Cost Dashboard", href: "/app/cost-dashboard" },
  { label: "Golden Set", href: "/app/golden-set" },
];

export function getNavItemsForRole(role: ProfileRole): NavItem[] {
  switch (role) {
    case "platform_admin":
      return PLATFORM_ADMIN_NAV;
    case "college_admin":
      return COLLEGE_ADMIN_NAV;
    case "student":
      return STUDENT_NAV;
  }
}
