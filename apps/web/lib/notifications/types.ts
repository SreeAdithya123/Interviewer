/**
 * Types for WhatsApp and Multi-Channel Notification Engine.
 * Tailored for Indian engineering college campus placement cells and candidates.
 */

export type NotificationType =
  | "mock_scheduled"
  | "drive_announced"
  | "round_reminder_1hr"
  | "scorecard_published";

export interface NotificationRecipient {
  studentName: string;
  phoneNumber: string; // E.164 e.g. "+919876543210"
  email: string;
  rollNumber?: string;
}

export interface NotificationPayload {
  type: NotificationType;
  recipient: NotificationRecipient;
  collegeName: string;
  companyName?: string;
  roleName?: string;
  packageCtc?: string;
  scheduledTime?: string;
  magicLink: string;
  score?: number;
  reportSummary?: string;
}

export interface DispatchedNotificationResult {
  messageId: string;
  recipientPhone: string;
  type: NotificationType;
  channel: "whatsapp" | "sms_fallback";
  status: "delivered" | "queued" | "failed";
  renderedMessageText: string;
  timestamp: string;
  providerCostEstimatePaise: number; // e.g. ~48 paise for Indian WhatsApp Utility template
}
