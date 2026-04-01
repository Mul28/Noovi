import { sendEmail } from "./lib/email.js";
import { addIssueComment, getIssue } from "./lib/paperclip.js";
import { parseLead } from "./lib/parseLead.js";
import {
  buildIntakeReminderEmail,
  buildPreviewReadyEmail,
  buildWelcomeEmail,
  type NooviEmailType
} from "./lib/templates.js";

export type SendIssueEmailForIssueInput = {
  issueId: string;
};

export type SendIssueEmailResult = {
  ok: boolean;
  recipient?: string;
  subject: string;
  emailType: NooviEmailType;
  messageId?: string;
  error?: string;
  issueCommentPosted: boolean;
};

function getIntakeUrl(): string {
  return process.env.INTAKE_FORM_URL || "https://noovi.com.au";
}

function getFromName(): string {
  return process.env.EMAIL_FROM_NAME || "Noovi";
}

function getFirstName(name: string): string {
  return (name.split(/\s+/).filter(Boolean)[0] || "there").trim();
}

async function sendIssueEmail(
  input: SendIssueEmailForIssueInput,
  emailType: NooviEmailType
): Promise<SendIssueEmailResult> {
  const issue = await getIssue(input.issueId);
  const lead = parseLead(issue.description || "");

  if (!lead.email) {
    await addIssueComment(
      input.issueId,
      "Blocked: no usable recipient email was found on this issue. No email was sent."
    );

    return {
      ok: false,
      subject: "No subject",
      emailType,
      error: "No usable recipient email",
      issueCommentPosted: true
    };
  }

  try {
    const email =
      emailType === "welcome"
        ? buildWelcomeEmail({
            firstName: getFirstName(lead.name),
            intakeUrl: getIntakeUrl(),
            fromName: getFromName()
          })
        : emailType === "intake_reminder"
          ? buildIntakeReminderEmail({
              firstName: getFirstName(lead.name),
              intakeUrl: getIntakeUrl(),
              fromName: getFromName()
            })
          : buildPreviewReadyEmail({
              firstName: getFirstName(lead.name),
              intakeUrl: getIntakeUrl(),
              previewUrl: lead.previewUrl,
              fromName: getFromName()
            });

    const result = await sendEmail({
      to: lead.email,
      subject: email.subject,
      body: email.text,
      html: email.html
    });

    await addIssueComment(
      input.issueId,
      `Recipient: ${lead.email}
Subject: ${email.subject}
Email type: ${email.emailType.replaceAll("_", " ")} email
Outcome: sent successfully
Next step: ${
        emailType === "preview_ready"
          ? "wait for approval or revision requests."
          : "wait for intake form completion or reply."
      }`
    );

    return {
      ok: true,
      recipient: lead.email,
      subject: email.subject,
      emailType,
      messageId: result.messageId,
      issueCommentPosted: true
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const subject =
      emailType === "welcome"
        ? "Thanks for your enquiry"
        : emailType === "intake_reminder"
          ? "Quick follow-up on your website enquiry"
          : "Your website preview is ready";

    await addIssueComment(
      input.issueId,
      `Recipient: ${lead.email}
Subject: ${subject}
Email type: ${emailType.replaceAll("_", " ")} email
Outcome: failed
Error: ${message}
Next step: investigate the email service before retrying.`
    );

    return {
      ok: false,
      recipient: lead.email,
      subject,
      emailType,
      error: message,
      issueCommentPosted: true
    };
  }
}

export async function send_welcome_email_for_issue(
  input: SendIssueEmailForIssueInput
): Promise<SendIssueEmailResult> {
  return sendIssueEmail(input, "welcome");
}

export async function send_intake_reminder_email_for_issue(
  input: SendIssueEmailForIssueInput
): Promise<SendIssueEmailResult> {
  return sendIssueEmail(input, "intake_reminder");
}

export async function send_preview_ready_email_for_issue(
  input: SendIssueEmailForIssueInput
): Promise<SendIssueEmailResult> {
  return sendIssueEmail(input, "preview_ready");
}

export default {
  send_welcome_email_for_issue,
  send_intake_reminder_email_for_issue,
  send_preview_ready_email_for_issue
};
