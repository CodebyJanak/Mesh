import { Resend } from 'resend'
import dotenv from 'dotenv'
dotenv.config()

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const APP = process.env.APP_NAME || 'Mesh'

// Welcome email after registration
export async function sendWelcomeEmail(to, username) {
  await resend.emails.send({
    from: `${APP} <${FROM}>`,
    to,
    subject: `Welcome to Mesh, ${username}!`,
    html: `
      <div style="background:#050507;color:#e8e8f0;font-family:monospace;padding:40px;max-width:520px;margin:0 auto;border:1px solid #1e1e2e;border-radius:12px;">
        <h1 style="color:#00f5c4;font-size:28px;margin-bottom:8px;">mesh</h1>
        <p style="color:#7a7a9a;margin-bottom:24px;">live streaming platform</p>
        <h2 style="font-size:20px;margin-bottom:12px;">Welcome, ${username} 👋</h2>
        <p style="color:#b0b0c8;line-height:1.7;">Your account is ready. Start streaming instantly — no setup required.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard"
           style="display:inline-block;margin-top:24px;padding:12px 24px;background:#00f5c4;color:#050507;border-radius:8px;font-weight:600;text-decoration:none;">
          go to dashboard →
        </a>
        <p style="margin-top:32px;font-size:12px;color:#3a3a55;">You're receiving this because you signed up at Mesh.</p>
      </div>
    `
  })
}

// Stream went live notification (for future use)
export async function sendStreamLiveEmail(to, username, streamTitle, streamLink) {
  await resend.emails.send({
    from: `${APP} <${FROM}>`,
    to,
    subject: `🔴 You're live — ${streamTitle}`,
    html: `
      <div style="background:#050507;color:#e8e8f0;font-family:monospace;padding:40px;max-width:520px;margin:0 auto;border:1px solid #1e1e2e;border-radius:12px;">
        <h1 style="color:#00f5c4;font-size:28px;margin-bottom:8px;">mesh</h1>
        <p style="color:#7a7a9a;margin-bottom:24px;">live streaming platform</p>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
          <span style="width:10px;height:10px;border-radius:50%;background:#ff3b5c;display:inline-block;"></span>
          <span style="color:#ff3b5c;font-weight:600;letter-spacing:0.1em;">LIVE</span>
        </div>
        <h2 style="font-size:20px;margin-bottom:8px;">${streamTitle}</h2>
        <p style="color:#7a7a9a;">@${username} is now streaming</p>
        <a href="${streamLink}"
           style="display:inline-block;margin-top:24px;padding:12px 24px;background:#00f5c4;color:#050507;border-radius:8px;font-weight:600;text-decoration:none;">
          watch stream →
        </a>
        <p style="margin-top:32px;font-size:12px;color:#3a3a55;">Share this link with your audience.</p>
      </div>
    `
  })
}

// Password reset (if you add it later)
export async function sendPasswordResetEmail(to, resetLink) {
  await resend.emails.send({
    from: `${APP} <${FROM}>`,
    to,
    subject: `Reset your Mesh password`,
    html: `
      <div style="background:#050507;color:#e8e8f0;font-family:monospace;padding:40px;max-width:520px;margin:0 auto;border:1px solid #1e1e2e;border-radius:12px;">
        <h1 style="color:#00f5c4;font-size:28px;margin-bottom:8px;">mesh</h1>
        <p style="color:#7a7a9a;margin-bottom:24px;">live streaming platform</p>
        <h2 style="font-size:20px;margin-bottom:12px;">Password Reset</h2>
        <p style="color:#b0b0c8;line-height:1.7;">Click below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetLink}"
           style="display:inline-block;margin-top:24px;padding:12px 24px;background:#00f5c4;color:#050507;border-radius:8px;font-weight:600;text-decoration:none;">
          reset password →
        </a>
        <p style="margin-top:16px;font-size:12px;color:#3a3a55;">If you didn't request this, ignore this email.</p>
      </div>
    `
  })
}