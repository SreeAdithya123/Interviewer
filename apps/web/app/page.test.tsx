import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home page", () => {
  it("renders the real landing page sections, not the Phase 0 placeholder", () => {
    render(<Home />);

    // The Phase 0 placeholder is gone.
    expect(screen.queryByText(/design system wired up/i)).not.toBeInTheDocument();

    // Hero headline (BUILD_SPEC 4.9). The same line is reused as the
    // Philosophy section's heading, so there are two legitimate matches.
    expect(screen.getAllByText(/the sky is not the limit/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/it is the foundation/i).length).toBeGreaterThan(0);

    // Both CTA paths from BUILD_SPEC 4.9 are present and link correctly.
    const startLinks = screen.getAllByRole("link", { name: /start practicing/i });
    expect(startLinks.length).toBeGreaterThan(0);
    expect(startLinks[0]).toHaveAttribute("href", "/signup");

    const demoLinks = screen.getAllByRole("link", { name: /book a demo for your college/i });
    expect(demoLinks.length).toBeGreaterThan(0);
    expect(demoLinks[0]).toHaveAttribute("href", "/book-a-demo");

    // Philosophy section.
    expect(screen.getByText(/means sky in/i)).toBeInTheDocument();

    // Updated feature set (not the old recruiter-era copy). Scoped to
    // heading role: "AI interview" and "Resume builder" also appear as
    // Footer link text, which would otherwise make these ambiguous.
    expect(screen.getByRole("heading", { name: /^AI interview$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Resume builder$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Resume scanner$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Prep assistant$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Placement dashboard$/i })).toBeInTheDocument();

    // New trust section BUILD_SPEC 4.9 calls for explicitly.
    expect(screen.getByText(/every score shows/i)).toBeInTheDocument();

    // Dropped sections never render.
    expect(screen.queryByText(/careers/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/community/i)).not.toBeInTheDocument();

    // No fabricated stats anywhere on the page.
    expect(screen.queryByText(/50,000\+/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/4\.9 ?\/ ?5/i)).not.toBeInTheDocument();
  });
});
