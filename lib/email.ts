// src/lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export function getPrimaryEmails() {
  const email = process.env.NOTIFICATION_EMAIL;
  return email && email.includes('@') ? email : null;
}

export function getSecondaryEmails() {
  let emails: string[] = [];
  if (process.env.SECONDARY_EMAIL) {
    emails = process.env.SECONDARY_EMAIL.split(',').map(e => e.trim()).filter(e => e.includes('@'));
  } else if (process.env.NOTIFICATION_EMAILS) {
    const all = process.env.NOTIFICATION_EMAILS.split(',').map(e => e.trim()).filter(e => e.includes('@'));
    emails = all.slice(1);
  }
  return emails;
}

export async function sendEmail({ to, subject, html, attachments = [] }: { to: string | string[], subject: string, html: string, attachments?: any[] }) {
  const from = process.env.RESEND_FROM || 'onboarding@resend.dev';
  if (!process.env.RESEND_API_KEY) return { success: false, error: 'No API Key' };
  
  try {
    const { data, error } = await resend.emails.send({ from, to, subject, html, attachments });
    if (error) return { success: false, error };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err };
  }
}