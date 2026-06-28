import { toast } from "sonner";

const baseOptions = { duration: 3500 };

export const notify = {
  success: (message: string, description?: string) =>
    toast.success(message, { ...baseOptions, description }),
  error: (message: string, description?: string) =>
    toast.error(message, { ...baseOptions, description }),
  info: (message: string, description?: string) =>
    toast.info(message, { ...baseOptions, description }),
  warning: (message: string, description?: string) =>
    toast.warning(message, { ...baseOptions, description }),
};

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\+?[0-9\s\-().]{7,20}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return PHONE_REGEX.test(value.trim());
}

export function isValidContact(value: string, channel: "whatsapp" | "email" | "sms"): boolean {
  if (!value.trim()) return false;
  return channel === "email" ? isValidEmail(value) : isValidPhone(value);
}
