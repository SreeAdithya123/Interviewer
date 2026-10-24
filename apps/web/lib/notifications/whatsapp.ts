import {
  DispatchedNotificationResult,
  NotificationPayload,
  NotificationType,
} from "./types";

/**
 * Formats WhatsApp template messages based on event type.
 */
export function renderWhatsAppMessage(payload: NotificationPayload): string {
  const { recipient, collegeName, type, companyName, roleName, packageCtc, scheduledTime, magicLink, score } =
    payload;

  switch (type) {
    case "mock_scheduled":
      return [
        `🎓 *${collegeName} Placement Training Cell*`,
        ``,
        `Hello *${recipient.studentName}* (${recipient.rollNumber || "Student"}),`,
        `Your AI Mock Interview for *${companyName || "Campus Placement"}* has been scheduled.`,
        ``,
        `📅 *Time:* ${scheduledTime || "Today, Flexible"}`,
        `🎯 *Target Role:* ${roleName || "Software Engineer"}`,
        ``,
        `🔗 *1-Click Access Link:*`,
        `${magicLink}`,
        ``,
        `💡 *Proctor Checklist:*`,
        `• Keep your webcam & microphone enabled`,
        `• Sit in a well-lit, quiet room without tab-switching`,
        `• Ensure full-screen mode is maintained throughout`,
      ].join("\n");

    case "drive_announced":
      return [
        `📢 *New Placement Drive Alert | ${collegeName}*`,
        ``,
        `Dear *${recipient.studentName}*,`,
        `A new recruitment drive has been announced on the campus portal:`,
        ``,
        `🏢 *Company:* ${companyName || "Top Tier Recruiter"}`,
        `💼 *Role:* ${roleName || "Graduate Engineer Trainee"}`,
        `💰 *Package (CTC):* ${packageCtc || "Best in Market"}`,
        ``,
        `Check your eligibility and start preliminary mock preparation:`,
        `👉 ${magicLink}`,
      ].join("\n");

    case "round_reminder_1hr":
      return [
        `⏳ *Urgent Reminder: Interview in 1 Hour | ${collegeName}*`,
        ``,
        `Hi *${recipient.studentName}*,`,
        `Your technical assessment round for *${companyName || "Campus Drive"}* starts in 60 minutes.`,
        ``,
        `Join session now:`,
        `👉 ${magicLink}`,
        ``,
        `⚠️ *Important:* Any background voice or tab switches will trigger proctor integrity flags.`,
      ].join("\n");

    case "scorecard_published":
      return [
        `📊 *Interview Scorecard Ready | ${collegeName}*`,
        ``,
        `Hi *${recipient.studentName}*,`,
        `Your AI interview evaluation has been generated.`,
        ``,
        `🎯 *Overall Readiness Score:* *${score ?? "Evaluated"}/100*`,
        `🏢 *Track:* ${companyName || "General Technical"}`,
        ``,
        `Read detailed dimension breakdown, diagnostic weak spots, and hiring recommendation:`,
        `👉 ${magicLink}`,
      ].join("\n");
  }
}

/**
 * Builds Meta WhatsApp Cloud API payload.
 */
export function buildMetaWhatsAppPayload(payload: NotificationPayload) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: payload.recipient.phoneNumber.replace(/[^\d]/g, ""),
    type: "text",
    text: {
      preview_url: true,
      body: renderWhatsAppMessage(payload),
    },
  };
}

/**
 * Dispatches (or simulates dispatch of) a WhatsApp notification to a student.
 */
export async function dispatchNotification(
  payload: NotificationPayload,
  simulateOnly: boolean = true
): Promise<DispatchedNotificationResult> {
  const rendered = renderWhatsAppMessage(payload);
  const messageId = `wa_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // If simulateOnly is true or no real API token is configured, return clean simulated dispatch result
  if (simulateOnly || !process.env.WHATSAPP_CLOUD_API_TOKEN) {
    return {
      messageId,
      recipientPhone: payload.recipient.phoneNumber,
      type: payload.type,
      channel: "whatsapp",
      status: "delivered",
      renderedMessageText: rendered,
      timestamp: new Date().toISOString(),
      providerCostEstimatePaise: 48, // Standard Indian Utility Template cost (approx ₹0.48)
    };
  }

  // Real WhatsApp Cloud API dispatch
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildMetaWhatsAppPayload(payload)),
    });

    if (!res.ok) {
      throw new Error(`WhatsApp API responded with status ${res.status}`);
    }

    const data = await res.json();
    return {
      messageId: data.messages?.[0]?.id || messageId,
      recipientPhone: payload.recipient.phoneNumber,
      type: payload.type,
      channel: "whatsapp",
      status: "delivered",
      renderedMessageText: rendered,
      timestamp: new Date().toISOString(),
      providerCostEstimatePaise: 48,
    };
  } catch (err) {
    return {
      messageId,
      recipientPhone: payload.recipient.phoneNumber,
      type: payload.type,
      channel: "sms_fallback",
      status: "queued",
      renderedMessageText: rendered,
      timestamp: new Date().toISOString(),
      providerCostEstimatePaise: 25,
    };
  }
}
