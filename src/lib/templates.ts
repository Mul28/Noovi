export type NooviEmailType = "welcome" | "intake_reminder" | "preview_ready";

export type NooviEmailTemplateInput = {
  firstName: string;
  intakeUrl: string;
  previewUrl?: string;
  fromName?: string;
};

export type NooviEmailTemplate = {
  subject: string;
  text: string;
  html: string;
  emailType: NooviEmailType;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeFirstName(firstName: string): string {
  const clean = firstName.trim();
  return clean || "there";
}

function normalizeFromName(fromName?: string): string {
  return (fromName || "Noovi").trim() || "Noovi";
}

export function buildWelcomeEmail(input: NooviEmailTemplateInput): NooviEmailTemplate {
  const firstName = normalizeFirstName(input.firstName);
  const fromName = normalizeFromName(input.fromName);

  const subject = "Thanks for your enquiry";
  const text = `Hi ${firstName},

Thanks for getting in touch with Noovi.

We build done-for-you websites for Australian tradies, and we handle the whole process by email, so there's no need for calls or meetings.

To get started, please complete this short intake form:
${input.intakeUrl}

Once we have your details, we can prepare the next step.

Reply to this email if you have any questions.

Thanks,
${fromName}

If you'd prefer not to hear from us again, just reply with unsubscribe.`;

  const html = `<p>Hi ${escapeHtml(firstName)},</p>
<p>Thanks for getting in touch with Noovi.</p>
<p>We build done-for-you websites for Australian tradies, and we handle the whole process by email, so there's no need for calls or meetings.</p>
<p>To get started, please complete this short intake form:<br><a href="${escapeHtml(input.intakeUrl)}">${escapeHtml(input.intakeUrl)}</a></p>
<p>Once we have your details, we can prepare the next step.</p>
<p>Reply to this email if you have any questions.</p>
<p>Thanks,<br>${escapeHtml(fromName)}</p>
<p>If you'd prefer not to hear from us again, just reply with unsubscribe.</p>`;

  return { subject, text, html, emailType: "welcome" };
}

export function buildIntakeReminderEmail(input: NooviEmailTemplateInput): NooviEmailTemplate {
  const firstName = normalizeFirstName(input.firstName);
  const fromName = normalizeFromName(input.fromName);

  const subject = "Quick follow-up on your website enquiry";
  const text = `Hi ${firstName},

Just following up on your website enquiry.

If you'd still like us to put this together for you, please complete the intake form here:
${input.intakeUrl}

Once that's in, we can move things forward.

Thanks,
${fromName}

If you'd prefer not to hear from us again, just reply with unsubscribe.`;

  const html = `<p>Hi ${escapeHtml(firstName)},</p>
<p>Just following up on your website enquiry.</p>
<p>If you'd still like us to put this together for you, please complete the intake form here:<br><a href="${escapeHtml(input.intakeUrl)}">${escapeHtml(input.intakeUrl)}</a></p>
<p>Once that's in, we can move things forward.</p>
<p>Thanks,<br>${escapeHtml(fromName)}</p>
<p>If you'd prefer not to hear from us again, just reply with unsubscribe.</p>`;

  return { subject, text, html, emailType: "intake_reminder" };
}

export function buildPreviewReadyEmail(input: NooviEmailTemplateInput): NooviEmailTemplate {
  const firstName = normalizeFirstName(input.firstName);
  const fromName = normalizeFromName(input.fromName);
  const previewUrl = (input.previewUrl || "").trim();

  if (!previewUrl) {
    throw new Error("Preview URL is required for preview-ready emails");
  }

  const subject = "Your website preview is ready";
  const text = `Hi ${firstName},

Your website preview is ready.

You can review it here:
${previewUrl}

If you'd like any changes, reply to this email with the edits you want and we'll work through them by email.

Thanks,
${fromName}`;

  const html = `<p>Hi ${escapeHtml(firstName)},</p>
<p>Your website preview is ready.</p>
<p>You can review it here:<br><a href="${escapeHtml(previewUrl)}">${escapeHtml(previewUrl)}</a></p>
<p>If you'd like any changes, reply to this email with the edits you want and we'll work through them by email.</p>
<p>Thanks,<br>${escapeHtml(fromName)}</p>`;

  return { subject, text, html, emailType: "preview_ready" };
}
