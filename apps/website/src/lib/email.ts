/**
 * Email service using Resend
 * Handles all transactional emails for ACT Farm
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'ACT Farm <hello@act.farm>';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: EmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error('❌ Email send error:', error);
      throw new Error(error.message);
    }

    console.log('✅ Email sent successfully:', { to: options.to, id: data?.id });
    return data;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
}

/**
 * Send newsletter welcome email
 */
export async function sendNewsletterWelcome(email: string, name?: string) {
  const displayName = name || 'Friend';

  return sendEmail({
    to: email,
    subject: '🌾 Welcome to ACT Farm Newsletter',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2d5016;">Welcome to ACT Farm, ${displayName}!</h1>

        <p style="font-size: 16px; line-height: 1.6;">
          Thank you for joining our newsletter! We're excited to share with you:
        </p>

        <ul style="font-size: 16px; line-height: 1.8;">
          <li>🌱 Updates on regenerative farming practices</li>
          <li>🎨 Art residency opportunities</li>
          <li>📚 Stories from our community</li>
          <li>🌍 Ways to connect with the ACT ecosystem</li>
        </ul>

        <p style="font-size: 16px; line-height: 1.6;">
          You'll hear from us with monthly updates, event invitations, and opportunities to engage with regenerative innovation.
        </p>

        <p style="font-size: 16px; line-height: 1.6;">
          With gratitude,<br>
          <strong>The ACT Farm Team</strong>
        </p>

        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;">

        <p style="font-size: 14px; color: #6b7280;">
          A Curious Tractor (ACT) Farm<br>
          <a href="https://act.farm" style="color: #2d5016;">act.farm</a>
        </p>
      </div>
    `,
    text: `
Welcome to ACT Farm, ${displayName}!

Thank you for joining our newsletter! We're excited to share with you:

• Updates on regenerative farming practices
• Art residency opportunities
• Stories from our community
• Ways to connect with the ACT ecosystem

You'll hear from us with monthly updates, event invitations, and opportunities to engage with regenerative innovation.

With gratitude,
The ACT Farm Team

---
A Curious Tractor (ACT) Farm
act.farm
    `.trim(),
  });
}

/**
 * Send farm stay booking confirmation
 */
export async function sendBookingConfirmation(
  email: string,
  name: string,
  bookingDetails: {
    dates: string;
    guests: number;
  }
) {
  return sendEmail({
    to: email,
    subject: '✅ Your ACT Farm Stay Booking Confirmed',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2d5016;">Booking Confirmed!</h1>

        <p style="font-size: 16px; line-height: 1.6;">
          Hi ${name},
        </p>

        <p style="font-size: 16px; line-height: 1.6;">
          Your farm stay booking has been confirmed! We're looking forward to hosting you.
        </p>

        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h3 style="margin-top: 0;">Booking Details</h3>
          <p><strong>Dates:</strong> ${bookingDetails.dates}</p>
          <p><strong>Guests:</strong> ${bookingDetails.guests}</p>
        </div>

        <p style="font-size: 16px; line-height: 1.6;">
          You'll receive more details about your stay in the coming days. If you have any questions, feel free to reply to this email.
        </p>

        <p style="font-size: 16px; line-height: 1.6;">
          See you soon!<br>
          <strong>The ACT Farm Team</strong>
        </p>
      </div>
    `,
  });
}

/**
 * Send CSA welcome email
 */
export async function sendCSAWelcome(email: string, name?: string) {
  const displayName = name || 'Friend';

  return sendEmail({
    to: email,
    subject: '🌾 Welcome to The Harvest CSA',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2d5016;">Welcome to The Harvest!</h1>

        <p style="font-size: 16px; line-height: 1.6;">
          Hi ${displayName},
        </p>

        <p style="font-size: 16px; line-height: 1.6;">
          Thank you for your interest in The Harvest CSA program! You're taking the first step toward connecting with regenerative food systems.
        </p>

        <h2 style="color: #2d5016;">What's Next?</h2>

        <ol style="font-size: 16px; line-height: 1.8;">
          <li>We'll review your application and get back to you within 2-3 business days</li>
          <li>You'll receive details about pickup locations and schedules</li>
          <li>We'll send you information about the upcoming harvest season</li>
        </ol>

        <p style="font-size: 16px; line-height: 1.6;">
          Questions? Just reply to this email and we'll be happy to help!
        </p>

        <p style="font-size: 16px; line-height: 1.6;">
          With gratitude,<br>
          <strong>The Harvest Team</strong>
        </p>
      </div>
    `,
  });
}

/**
 * Send art residency acknowledgment
 */
export async function sendResidencyAcknowledgment(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: '🎨 Your Art Residency Application Received',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2d5016;">Application Received!</h1>

        <p style="font-size: 16px; line-height: 1.6;">
          Hi ${name},
        </p>

        <p style="font-size: 16px; line-height: 1.6;">
          Thank you for applying to the ACT Farm Art Residency program. We've received your application and our team is excited to review it.
        </p>

        <h2 style="color: #2d5016;">What Happens Next?</h2>

        <ul style="font-size: 16px; line-height: 1.8;">
          <li>📋 Our team will review your application (1-2 weeks)</li>
          <li>💬 We may reach out for additional information</li>
          <li>📅 Selected artists will be notified by email</li>
        </ul>

        <p style="font-size: 16px; line-height: 1.6;">
          We receive many exceptional applications and carefully consider each one. Thank you for your patience!
        </p>

        <p style="font-size: 16px; line-height: 1.6;">
          Best regards,<br>
          <strong>The ACT Farm Residency Team</strong>
        </p>
      </div>
    `,
  });
}

/**
 * Send partnership inquiry notification to ACT team
 * Resolves issue #11
 */
export async function sendPartnershipNotification(contactDetails: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
}) {
  const teamEmail = process.env.ACT_TEAM_EMAIL || 'team@act.farm';

  return sendEmail({
    to: teamEmail,
    subject: `🤝 New Partnership Inquiry from ${contactDetails.name}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2d5016;">New Partnership Inquiry</h1>

        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h3 style="margin-top: 0;">Contact Details</h3>
          <p><strong>Name:</strong> ${contactDetails.name}</p>
          <p><strong>Email:</strong> <a href="mailto:${contactDetails.email}">${contactDetails.email}</a></p>
          ${contactDetails.phone ? `<p><strong>Phone:</strong> ${contactDetails.phone}</p>` : ''}
          ${contactDetails.company ? `<p><strong>Company:</strong> ${contactDetails.company}</p>` : ''}
        </div>

        ${contactDetails.message ? `
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h3 style="margin-top: 0;">Message</h3>
            <p style="white-space: pre-wrap;">${contactDetails.message}</p>
          </div>
        ` : ''}

        <p style="font-size: 14px; color: #6b7280;">
          This inquiry was submitted via the ACT website contact form.
        </p>
      </div>
    `,
  });
}

/**
 * Send residency coordinator notification
 * Resolves issue #22
 */
export async function sendResidencyCoordinatorNotification(applicantDetails: {
  name: string;
  email: string;
  phone?: string;
  practice?: string;
  dates?: string;
  project?: string;
}) {
  const coordinatorEmail = process.env.RESIDENCY_COORDINATOR_EMAIL || 'residency@act.farm';

  return sendEmail({
    to: coordinatorEmail,
    subject: `🎨 New Art Residency Application from ${applicantDetails.name}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2d5016;">New Residency Application</h1>

        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h3 style="margin-top: 0;">Artist Details</h3>
          <p><strong>Name:</strong> ${applicantDetails.name}</p>
          <p><strong>Email:</strong> <a href="mailto:${applicantDetails.email}">${applicantDetails.email}</a></p>
          ${applicantDetails.phone ? `<p><strong>Phone:</strong> ${applicantDetails.phone}</p>` : ''}
          ${applicantDetails.practice ? `<p><strong>Art Practice:</strong> ${applicantDetails.practice}</p>` : ''}
          ${applicantDetails.dates ? `<p><strong>Proposed Dates:</strong> ${applicantDetails.dates}</p>` : ''}
        </div>

        ${applicantDetails.project ? `
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h3 style="margin-top: 0;">Project Description</h3>
            <p style="white-space: pre-wrap;">${applicantDetails.project}</p>
          </div>
        ` : ''}

        <p style="font-size: 14px; color: #6b7280;">
          This application was submitted via the ACT Farm website. The applicant has been sent an acknowledgment email.
        </p>
      </div>
    `,
  });
}
