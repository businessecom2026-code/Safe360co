import { Resend } from 'resend';
import {
  inviteGuestEmail,
  passwordResetEmail,
  welcomeEmail,
  guestActivatedEmail,
  supportContactEmail,
} from './emailTemplates';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || 'Safe360 <info@ecom360.co>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// ─── Send Invite Email to Guest ───
export async function sendInviteEmail(guestEmail: string, adminEmail: string, inviteToken: string): Promise<boolean> {
  const inviteLink = `${APP_URL}/#invite=${inviteToken}`;
  const { subject, html } = inviteGuestEmail({ guestEmail, adminEmail, inviteLink });

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: guestEmail,
      subject,
      html,
    });

    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

// ─── Send Password Reset Email ───
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetLink = `${APP_URL}/#reset=${resetToken}`;
  const { subject, html } = passwordResetEmail({ email, resetLink });

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject,
      html,
    });

    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

// ─── Send Welcome Email ───
export async function sendWelcomeEmail(email: string): Promise<boolean> {
  const loginLink = `${APP_URL}/#login`;
  const { subject, html } = welcomeEmail({ email, loginLink });

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject,
      html,
    });

    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

// ─── Notify Admin when Guest Activates ───
export async function sendGuestActivatedNotification(adminEmail: string, guestEmail: string): Promise<boolean> {
  const dashboardLink = `${APP_URL}/#dashboard`;
  const { subject, html } = guestActivatedEmail({ adminEmail, guestEmail, dashboardLink });

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: adminEmail,
      subject,
      html,
    });

    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

// ─── Forward Support Message ───
export async function sendSupportEmail(name: string, email: string, message: string): Promise<boolean> {
  const { subject, html } = supportContactEmail({ name, email, message });

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: 'info@ecom360.co',
      replyTo: email,
      subject,
      html,
    });

    if (error) return false;
    return true;
  } catch {
    return false;
  }
}
