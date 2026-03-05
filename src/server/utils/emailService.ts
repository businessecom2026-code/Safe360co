import { Resend } from 'resend';
import {
  inviteGuestEmail,
  passwordResetEmail,
  welcomeEmail,
  guestActivatedEmail,
  supportContactEmail,
} from './emailTemplates';

const FROM = process.env.RESEND_FROM || 'Safe360 <info@ecom360.co>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Lazy — only instantiate when RESEND_API_KEY is available at send time
let _resend: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return _resend ??= new Resend(key);
}

// ─── Send Invite Email to Guest ───
export async function sendInviteEmail(guestEmail: string, adminEmail: string, inviteToken: string): Promise<boolean> {
  const inviteLink = `${APP_URL}/#invite=${inviteToken}`;
  const { subject, html } = inviteGuestEmail({ guestEmail, adminEmail, inviteLink });

  const client = getResend();
  if (!client) return false;
  try {
    const { error } = await client.emails.send({ from: FROM, to: guestEmail, subject, html });
    return !error;
  } catch {
    return false;
  }
}

// ─── Send Password Reset Email ───
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetLink = `${APP_URL}/#reset=${resetToken}`;
  const { subject, html } = passwordResetEmail({ email, resetLink });
  const client = getResend();
  if (!client) return false;
  try {
    const { error } = await client.emails.send({ from: FROM, to: email, subject, html });
    return !error;
  } catch {
    return false;
  }
}

// ─── Send Welcome Email ───
export async function sendWelcomeEmail(email: string): Promise<boolean> {
  const loginLink = `${APP_URL}/#login`;
  const { subject, html } = welcomeEmail({ email, loginLink });
  const client = getResend();
  if (!client) return false;
  try {
    const { error } = await client.emails.send({ from: FROM, to: email, subject, html });
    return !error;
  } catch {
    return false;
  }
}

// ─── Notify Admin when Guest Activates ───
export async function sendGuestActivatedNotification(adminEmail: string, guestEmail: string): Promise<boolean> {
  const dashboardLink = `${APP_URL}/#dashboard`;
  const { subject, html } = guestActivatedEmail({ adminEmail, guestEmail, dashboardLink });
  const client = getResend();
  if (!client) return false;
  try {
    const { error } = await client.emails.send({ from: FROM, to: adminEmail, subject, html });
    return !error;
  } catch {
    return false;
  }
}

// ─── Forward Support Message ───
export async function sendSupportEmail(name: string, email: string, message: string): Promise<boolean> {
  const { subject, html } = supportContactEmail({ name, email, message });
  const client = getResend();
  if (!client) return false;
  try {
    const { error } = await client.emails.send({ from: FROM, to: 'info@ecom360.co', replyTo: email, subject, html });
    return !error;
  } catch {
    return false;
  }
}
