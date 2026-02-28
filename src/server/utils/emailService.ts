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
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: guestEmail,
      subject,
      html,
    });

    if (error) {
      console.error('[Email] Failed to send invite email:', error);
      return false;
    }

    console.log(`[Email] Invite sent to ${guestEmail} (id: ${data?.id})`);
    return true;
  } catch (err) {
    console.error('[Email] Error sending invite:', err);
    return false;
  }
}

// ─── Send Password Reset Email ───
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetLink = `${APP_URL}/#reset=${resetToken}`;
  const { subject, html } = passwordResetEmail({ email, resetLink });

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject,
      html,
    });

    if (error) {
      console.error('[Email] Failed to send reset email:', error);
      return false;
    }

    console.log(`[Email] Reset email sent to ${email} (id: ${data?.id})`);
    return true;
  } catch (err) {
    console.error('[Email] Error sending reset email:', err);
    return false;
  }
}

// ─── Send Welcome Email ───
export async function sendWelcomeEmail(email: string): Promise<boolean> {
  const loginLink = `${APP_URL}/#login`;
  const { subject, html } = welcomeEmail({ email, loginLink });

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject,
      html,
    });

    if (error) {
      console.error('[Email] Failed to send welcome email:', error);
      return false;
    }

    console.log(`[Email] Welcome email sent to ${email} (id: ${data?.id})`);
    return true;
  } catch (err) {
    console.error('[Email] Error sending welcome email:', err);
    return false;
  }
}

// ─── Notify Admin when Guest Activates ───
export async function sendGuestActivatedNotification(adminEmail: string, guestEmail: string): Promise<boolean> {
  const dashboardLink = `${APP_URL}/#dashboard`;
  const { subject, html } = guestActivatedEmail({ adminEmail, guestEmail, dashboardLink });

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: adminEmail,
      subject,
      html,
    });

    if (error) {
      console.error('[Email] Failed to send activation notification:', error);
      return false;
    }

    console.log(`[Email] Guest activation notified to ${adminEmail} (id: ${data?.id})`);
    return true;
  } catch (err) {
    console.error('[Email] Error sending activation notification:', err);
    return false;
  }
}

// ─── Forward Support Message ───
export async function sendSupportEmail(name: string, email: string, message: string): Promise<boolean> {
  const { subject, html } = supportContactEmail({ name, email, message });

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: 'info@ecom360.co',
      replyTo: email,
      subject,
      html,
    });

    if (error) {
      console.error('[Email] Failed to send support email:', error);
      return false;
    }

    console.log(`[Email] Support message forwarded (id: ${data?.id})`);
    return true;
  } catch (err) {
    console.error('[Email] Error sending support email:', err);
    return false;
  }
}
