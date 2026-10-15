import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home page", () => {
  it("renders the Phase 0 placeholder without throwing", () => {
    render(<Home />);

    expect(
      screen.getByRole("button", { name: /start a mock interview/i }),
    ).toBeInTheDocument();
  });
});
