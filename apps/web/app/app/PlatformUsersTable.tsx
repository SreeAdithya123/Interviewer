"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Download,
  Users,
  Building2,
  GraduationCap,
  Shield,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { downloadCsv } from "@/lib/csv";

export interface PlatformUserRow {
  id: string;
  fullName: string | null;
  email: string;
  role: "student" | "college_admin" | "platform_admin";
  collegeId: string | null;
  collegeName: string;
  department: string | null;
  graduationYear: number | null;
  createdAt: string;
}

interface PlatformUsersTableProps {
  users: PlatformUserRow[];
  colleges: { id: string; name: string }[];
}

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  college_admin: "College Admin",
  platform_admin: "Platform Admin",
};

const ROLE_BADGES: Record<string, string> = {
  student:
    "bg-blue-50 text-blue-800 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40",
  college_admin:
    "bg-purple-50 text-purple-800 border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40",
  platform_admin:
    "bg-zinc-100 text-zinc-900 border-zinc-300/80 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700",
};

const PAGE_SIZE = 10;

export function PlatformUsersTable({ users, colleges }: PlatformUsersTableProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [collegeFilter, setCollegeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Counts for filter pills
  const counts = useMemo(() => {
    return {
      all: users.length,
      student: users.filter((u) => u.role === "student").length,
      college_admin: users.filter((u) => u.role === "college_admin").length,
      platform_admin: users.filter((u) => u.role === "platform_admin").length,
    };
  }, [users]);

  // Filtered dataset
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      // Search matches name, email, or college name
      if (query) {
        const haystack = `${user.fullName || ""} ${user.email} ${user.collegeName}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      // Role filter
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      // College filter
      if (collegeFilter !== "all") {
        if (collegeFilter === "independent") {
          if (user.collegeId) return false;
        } else if (user.collegeId !== collegeFilter) {
          return false;
        }
      }
      return true;
    });
  }, [users, search, roleFilter, collegeFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (validPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, validPage]);

  // CSV Export
  const handleExportCsv = () => {
    const header = [
      "Full Name",
      "Email",
      "Role",
      "College Name",
      "Department",
      "Graduation Year",
      "Registered Date",
    ];
    const rows = filteredUsers.map((u) => [
      u.fullName || "—",
      u.email,
      ROLE_LABELS[u.role] || u.role,
      u.collegeName,
      u.department || "—",
      u.graduationYear ? String(u.graduationYear) : "—",
      new Date(u.createdAt).toISOString().slice(0, 10),
    ]);
    downloadCsv(`vyoman-platform-users-${new Date().toISOString().slice(0, 10)}.csv`, [
      header,
      ...rows,
    ]);
  };

  const getInitials = (name: string | null, email: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card shadow-sm space-y-4 font-body">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-headline text-base font-semibold text-foreground">
              Total Platform Users
            </h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
              {users.length} registered
            </span>
          </div>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            Complete registry of students, institutional college admins, and platform administrators along with their assigned institutions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            title="Download CSV report of platform users"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-5 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, email, or college name..."
              className="w-full rounded-lg border border-border/80 bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-0"
            />
          </div>

          {/* College Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select
              value={collegeFilter}
              onChange={(e) => {
                setCollegeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-foreground focus:outline-none focus:ring-0 max-w-[200px] truncate"
            >
              <option value="all">All Colleges & Direct ({users.length})</option>
              <option value="independent">Independent / Unassigned</option>
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Role Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => {
              setRoleFilter("all");
              setCurrentPage(1);
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              roleFilter === "all"
                ? "bg-foreground text-background font-semibold"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            All Users ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => {
              setRoleFilter("student");
              setCurrentPage(1);
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              roleFilter === "student"
                ? "bg-foreground text-background font-semibold"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Students ({counts.student})
          </button>
          <button
            type="button"
            onClick={() => {
              setRoleFilter("college_admin");
              setCurrentPage(1);
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              roleFilter === "college_admin"
                ? "bg-foreground text-background font-semibold"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            College Admins ({counts.college_admin})
          </button>
          <button
            type="button"
            onClick={() => {
              setRoleFilter("platform_admin");
              setCurrentPage(1);
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              roleFilter === "platform_admin"
                ? "bg-foreground text-background font-semibold"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Platform Admins ({counts.platform_admin})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-body text-xs">
          <thead>
            <tr className="border-b border-t border-border/80 bg-muted/20 text-muted-foreground">
              <th className="px-5 py-2.5 font-medium">User Profile</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Affiliated College</th>
              <th className="px-4 py-2.5 font-medium">Department / Cohort</th>
              <th className="px-5 py-2.5 text-right font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <Users className="h-6 w-6 text-muted-foreground/60" />
                    <p className="font-medium text-foreground">No users found</p>
                    <p className="text-[11px]">Try adjusting your search terms or filter criteria.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  {/* User Profile */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold text-foreground border border-border/60">
                        {getInitials(user.fullName, user.email)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate max-w-[200px]">
                          {user.fullName || "Unnamed User"}
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground truncate max-w-[200px]">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Role Badge */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-medium ${
                        ROLE_BADGES[user.role] || "bg-muted text-foreground"
                      }`}
                    >
                      {user.role === "student" && <GraduationCap className="h-3 w-3" />}
                      {user.role === "college_admin" && <Building2 className="h-3 w-3" />}
                      {user.role === "platform_admin" && <Shield className="h-3 w-3" />}
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>

                  {/* Affiliated College */}
                  <td className="px-4 py-3">
                    {user.collegeId ? (
                      <Link
                        href={`/app/colleges/${user.collegeId}`}
                        className="group inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors"
                      >
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                        <span className="underline-offset-2 group-hover:underline">
                          {user.collegeName}
                        </span>
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        Independent / Direct
                      </span>
                    )}
                  </td>

                  {/* Department / Cohort */}
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.department ? (
                      <div>
                        <span className="font-medium text-foreground">{user.department}</span>
                        {user.graduationYear && (
                          <span className="font-mono text-[11px] text-muted-foreground ml-1">
                            &apos;{String(user.graduationYear).slice(-2)}
                          </span>
                        )}
                      </div>
                    ) : user.role !== "student" ? (
                      <span className="font-mono text-[11px] text-muted-foreground">Institutional Staff</span>
                    ) : (
                      <span className="font-mono text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Joined Date */}
                  <td className="px-5 py-3 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
                    {new Date(user.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/80 px-5 py-3 text-xs text-muted-foreground">
        <div>
          Showing{" "}
          <span className="font-medium text-foreground">
            {filteredUsers.length === 0 ? 0 : (validPage - 1) * PAGE_SIZE + 1}
          </span>{" "}
          to{" "}
          <span className="font-medium text-foreground">
            {Math.min(validPage * PAGE_SIZE, filteredUsers.length)}
          </span>{" "}
          of <span className="font-medium text-foreground">{filteredUsers.length}</span> platform users
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={validPage <= 1}
            className="inline-flex items-center gap-1 rounded border border-border/80 bg-background px-2.5 py-1 font-medium text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </button>
          <span className="font-mono text-[11px]">
            Page {validPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={validPage >= totalPages}
            className="inline-flex items-center gap-1 rounded border border-border/80 bg-background px-2.5 py-1 font-medium text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default PlatformUsersTable;
