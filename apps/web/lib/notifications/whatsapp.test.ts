import { describe, expect, it } from "vitest";
import {
  buildMetaWhatsAppPayload,
  dispatchNotification,
  renderWhatsAppMessage,
} from "./whatsapp";

describe("WhatsApp Placement Notification Engine", () => {
  it("renders mock scheduled template with proctor checklist", () => {
    const message = renderWhatsAppMessage({
      type: "mock_scheduled",
      recipient: {
        studentName: "Adithya",
        phoneNumber: "+919876543210",
        email: "adithya@sasi.ac.in",
        rollNumber: "21A91A0501",
      },
      collegeName: "SASI Institute of Technology & Engineering",
      companyName: "TCS NQT 2026",
      roleName: "Ninja & Digital Track",
      magicLink: "https://vyoman.ai/app/interview?token=abc123xyz",
    });

    expect(message).toContain("SASI Institute of Technology & Engineering");
    expect(message).toContain("Adithya");
    expect(message).toContain("TCS NQT 2026");
    expect(message).toContain("Proctor Checklist");
    expect(message).toContain("Keep your webcam & microphone enabled");
  });

  it("builds Meta WhatsApp Cloud API payload", () => {
    const payload = {
      type: "drive_announced" as const,
      recipient: {
        studentName: "Priya",
        phoneNumber: "+91 98765 43211",
        email: "priya@example.com",
      },
      collegeName: "VIT Chennai",
      companyName: "Infosys Specialist Programmer",
      packageCtc: "9.5 LPA",
      magicLink: "https://vyoman.ai/app/drives/infy-sp",
    };

    const apiBody = buildMetaWhatsAppPayload(payload);
    expect(apiBody.messaging_product).toBe("whatsapp");
    expect(apiBody.to).toBe("919876543211");
    expect(apiBody.text.body).toContain("9.5 LPA");
  });

  it("simulates dispatch with utility template cost estimate (paise)", async () => {
    const result = await dispatchNotification(
      {
        type: "scorecard_published",
        recipient: {
          studentName: "Rohan",
          phoneNumber: "+919988776655",
          email: "rohan@example.com",
        },
        collegeName: "Amrita University",
        companyName: "Amazon SDE-1",
        score: 84,
        magicLink: "https://vyoman.ai/app/interview/rep123/report",
      },
      true // simulation mode
    );

    expect(result.status).toBe("delivered");
    expect(result.providerCostEstimatePaise).toBe(48); // ~₹0.48
    expect(result.renderedMessageText).toContain("*Overall Readiness Score:* *84/100*");
  });
});
