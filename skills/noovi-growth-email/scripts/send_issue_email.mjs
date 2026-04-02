#!/usr/bin/env node

const VALID_EMAIL_TYPES = new Set(["welcome", "intake_reminder", "preview_ready"]);

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    args[key] = value;
    i += 1;
  }

  return args;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getFirstName(name) {
  return (name || "").trim().split(/\s+/).filter(Boolean)[0] || "there";
}

function parseLead(description) {
  const fields = {};

  for (const line of description.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    fields[key] = value;
  }

  const rawEmail = (fields.email || "").trim();
  const invalidEmails = new Set(["", "unknown", "no email"]);

  return {
    name: fields.name || "",
    email: invalidEmails.has(rawEmail.toLowerCase()) ? "" : rawEmail,
    previewUrl: fields["preview url"] || fields["preview_url"] || ""
  };
}

function getTemplate(emailType, lead) {
  const intakeUrl = process.env.INTAKE_FORM_URL || "https://noovi.com.au";
  const fromName = process.env.EMAIL_FROM_NAME || "Noovi";
  const firstName = getFirstName(lead.name);

  if (emailType === "welcome") {
    return {
      subject: "Thanks for your enquiry",
      nextStep: "wait for intake form completion or reply.",
      text: `Hi ${firstName},

Thanks for getting in touch with Noovi.

We build done-for-you websites for Australian tradies, and we handle the whole process by email, so there's no need for calls or meetings.

To get started, please complete this short intake form:
${intakeUrl}

Once we have your details, we can prepare the next step.

Reply to this email if you have any questions.

Thanks,
${fromName}

If you'd prefer not to hear from us again, just reply with unsubscribe.`,
      html: `<p>Hi ${firstName},</p>
<p>Thanks for getting in touch with Noovi.</p>
<p>We build done-for-you websites for Australian tradies, and we handle the whole process by email, so there's no need for calls or meetings.</p>
<p>To get started, please complete this short intake form:<br><a href="${intakeUrl}">${intakeUrl}</a></p>
<p>Once we have your details, we can prepare the next step.</p>
<p>Reply to this email if you have any questions.</p>
<p>Thanks,<br>${fromName}</p>
<p>If you'd prefer not to hear from us again, just reply with unsubscribe.</p>`
    };
  }

  if (emailType === "intake_reminder") {
    return {
      subject: "Quick follow-up on your website enquiry",
      nextStep: "wait for intake form completion or reply.",
      text: `Hi ${firstName},

Just following up on your website enquiry.

If you'd still like us to put this together for you, please complete the intake form here:
${intakeUrl}

Once that's in, we can move things forward.

Thanks,
${fromName}

If you'd prefer not to hear from us again, just reply with unsubscribe.`,
      html: `<p>Hi ${firstName},</p>
<p>Just following up on your website enquiry.</p>
<p>If you'd still like us to put this together for you, please complete the intake form here:<br><a href="${intakeUrl}">${intakeUrl}</a></p>
<p>Once that's in, we can move things forward.</p>
<p>Thanks,<br>${fromName}</p>
<p>If you'd prefer not to hear from us again, just reply with unsubscribe.</p>`
    };
  }

  const previewUrl = (lead.previewUrl || "").trim();
  if (!previewUrl) {
    throw new Error("Preview URL is required for preview-ready emails");
  }

  return {
    subject: "Your website preview is ready",
    nextStep: "wait for approval or revision requests.",
    text: `Hi ${firstName},

Your website preview is ready.

You can review it here:
${previewUrl}

If you'd like any changes, reply to this email with the edits you want and we'll work through them by email.

Thanks,
${fromName}`,
    html: `<p>Hi ${firstName},</p>
<p>Your website preview is ready.</p>
<p>You can review it here:<br><a href="${previewUrl}">${previewUrl}</a></p>
<p>If you'd like any changes, reply to this email with the edits you want and we'll work through them by email.</p>
<p>Thanks,<br>${fromName}</p>`
  };
}

async function paperclipRequest(path, init = {}) {
  const apiUrl = requireEnv("PAPERCLIP_API_URL").replace(/\/$/, "");
  const headers = {
    Authorization: `Bearer ${requireEnv("PAPERCLIP_API_KEY")}`,
    "Content-Type": "application/json",
    ...init.headers
  };

  if (process.env.PAPERCLIP_RUN_ID) {
    headers["X-Paperclip-Run-Id"] = process.env.PAPERCLIP_RUN_ID;
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    throw new Error(`Paperclip request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function sendViaLocalService({ to, subject, body, html }) {
  const response = await fetch("http://127.0.0.1:3300/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, body, html })
  });

  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error || `Email send failed: ${response.status}`);
  }

  return result;
}

async function addIssueComment(issueId, body) {
  await paperclipRequest(`/api/issues/${issueId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body })
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const issueId = args["issue-id"];
  const emailType = args["email-type"];

  if (!issueId) {
    throw new Error("Missing required argument: --issue-id");
  }

  if (!VALID_EMAIL_TYPES.has(emailType)) {
    throw new Error("Invalid or missing --email-type. Use welcome, intake_reminder, or preview_ready");
  }

  const issue = await paperclipRequest(`/api/issues/${issueId}`);
  const lead = parseLead(issue.description || "");

  if (!lead.email) {
    const message = "Blocked: no usable recipient email was found on this issue. No email was sent.";
    await addIssueComment(issueId, message);
    console.log(
      JSON.stringify(
        {
          ok: false,
          subject: "No subject",
          emailType,
          error: "No usable recipient email",
          issueCommentPosted: true
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  try {
    const template = getTemplate(emailType, lead);
    const result = await sendViaLocalService({
      to: lead.email,
      subject: template.subject,
      body: template.text,
      html: template.html
    });

    await addIssueComment(
      issueId,
      `Recipient: ${lead.email}
Subject: ${template.subject}
Email type: ${emailType.replaceAll("_", " ")} email
Outcome: sent successfully
Next step: ${template.nextStep}`
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          recipient: lead.email,
          subject: template.subject,
          emailType,
          messageId: result.messageId,
          issueCommentPosted: true
        },
        null,
        2
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const subject =
      emailType === "welcome"
        ? "Thanks for your enquiry"
        : emailType === "intake_reminder"
          ? "Quick follow-up on your website enquiry"
          : "Your website preview is ready";

    await addIssueComment(
      issueId,
      `Recipient: ${lead.email}
Subject: ${subject}
Email type: ${emailType.replaceAll("_", " ")} email
Outcome: failed
Error: ${message}
Next step: investigate the email service before retrying.`
    );

    console.log(
      JSON.stringify(
        {
          ok: false,
          recipient: lead.email,
          subject,
          emailType,
          error: message,
          issueCommentPosted: true
        },
        null,
        2
      )
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
