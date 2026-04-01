import { sendEmail } from "./lib/email.js";
import { addIssueComment, getIssue } from "./lib/paperclip.js";
import { parseLead } from "./lib/parseLead.js";

export type SendWelcomeEmailForIssueInput = {
  issueId: string;
};

export type SendWelcomeEmailForIssueResult = {
  ok: boolean;
  recipient?: string;
  subject: string;
  emailType: "welcome";
  messageId?: string;
  error?: string;
  issueCommentPosted: boolean;
};

function getIntakeUrl(): string {
  return process.env.INTAKE_FORM_URL || "https://noovi.com.au";
}

function buildWelcomeEmail(firstName: string, intakeUrl: string) {
  const subject = "Thanks for your enquiry";
  const text = `Hi ${firstName},

Thanks for getting in touch with Noovi.

We build done-for-you websites for Australian tradies, and we handle the whole process by email, so there's no need for calls or meetings.

To get started, please complete this short intake form:
${intakeUrl}

Once we have your details, we can prepare the next step.

Reply to this email if you have any questions.

Thanks,
Noovi

If you'd prefer not to hear from us again, just reply with unsubscribe.`;

  const html = `<p>Hi ${firstName},</p>
<p>Thanks for getting in touch with Noovi.</p>
<p>We build done-for-you websites for Australian tradies, and we handle the whole process by email, so there's no need for calls or meetings.</p>
<p>To get started, please complete this short intake form:<br><a href="${intakeUrl}">${intakeUrl}</a></p>
<p>Once we have your details, we can prepare the next step.</p>
<p>Reply to this email if you have any questions.</p>
<p>Thanks,<br>Noovi</p>
<p>If you'd prefer not to hear from us again, just reply with unsubscribe.</p>`;

  return { subject, text, html };
}

export async function send_welcome_email_for_issue(
  input: SendWelcomeEmailForIssueInput
): Promise<SendWelcomeEmailForIssueResult> {
  const issue = await getIssue(input.issueId);
  const lead = parseLead(issue.description || "");
  const subject = "Thanks for your enquiry";

  if (!lead.email) {
    await addIssueComment(
      input.issueId,
      "Blocked: no usable recipient email was found on this issue. No email was sent."
    );

    return {
      ok: false,
      subject,
      emailType: "welcome",
      error: "No usable recipient email",
      issueCommentPosted: true
    };
  }

  const firstName = (lead.name.split(/\s+/).filter(Boolean)[0] || "there").trim();
  const { text, html } = buildWelcomeEmail(firstName, getIntakeUrl());

  try {
    const result = await sendEmail({
      to: lead.email,
      subject,
      body: text,
      html
    });

    await addIssueComment(
      input.issueId,
      `Recipient: ${lead.email}
Subject: ${subject}
Email type: welcome email
Outcome: sent successfully
Next step: wait for intake form completion or reply.`
    );

    return {
      ok: true,
      recipient: lead.email,
      subject,
      emailType: "welcome",
      messageId: result.messageId,
      issueCommentPosted: true
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await addIssueComment(
      input.issueId,
      `Recipient: ${lead.email}
Subject: ${subject}
Email type: welcome email
Outcome: failed
Error: ${message}
Next step: investigate the email service before retrying.`
    );

    return {
      ok: false,
      recipient: lead.email,
      subject,
      emailType: "welcome",
      error: message,
      issueCommentPosted: true
    };
  }
}

export default {
  send_welcome_email_for_issue
};
