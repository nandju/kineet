export type Channel = "whatsapp" | "email" | "sms";

export type CampaignStatus = "sent" | "sending" | "failed" | "draft";

export interface Recipient {
  id: string;
  lastName: string;
  firstName: string;
  contact: string; // email or phone, depending on channel
  valid: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  channel: Channel;
  status: CampaignStatus;
  recipients: number;
  delivered: number;
  failed: number;
  subject?: string;
  message: string;
  createdAt: string; // ISO date
}

export interface Profile {
  name: string;
  company: string;
  phone: string;
  email: string;
  photo: string; // url or data uri
}

export interface Settings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  campaignReports: boolean;
  darkMode: boolean;
  language: string;
  emailSignature: string;
}

export const CHANNEL_LABELS: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  sms: "SMS",
};
