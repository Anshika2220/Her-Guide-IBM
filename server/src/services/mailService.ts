import { env, isProd } from '../config/env';

/**
 * Placeholder mail transport. In development the reset link is printed to the
 * server console. In production this throws until a real provider (SMTP/SES/
 * Resend etc.) is wired in -- it deliberately does NOT pretend to send mail.
 */
export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${env.CLIENT_URL}/reset-password?token=${token}`;
  if (!isProd) {
    console.log(`[dev mail] Password reset for ${to}: ${link}`);
    return;
  }
  throw new Error('Email provider not configured');
}
