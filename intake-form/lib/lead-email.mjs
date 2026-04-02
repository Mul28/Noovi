function getFirstName(name) {
  return (name || "").trim().split(/\s+/).filter(Boolean)[0] || "there";
}

export function buildLeadWelcomeEmail(payload, config = {}) {
  const firstName = getFirstName(payload.name);
  const intakeUrl = config.intakeUrl || "https://noovi.com.au";
  const fromName = config.fromName || "Noovi";

  return {
    subject: "Thanks for your enquiry",
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

export async function sendLeadWelcomeEmail(payload, config = {}) {
  const apiKey = config.resendApiKey || process.env.RESEND_API_KEY;
  const fromAddress = config.fromAddress || process.env.EMAIL_FROM_ADDRESS;
  const fromName = config.fromName || process.env.EMAIL_FROM_NAME || "Noovi";
  const intakeUrl = config.intakeUrl || process.env.INTAKE_FORM_URL || "https://noovi.com.au";

  if (!apiKey || !fromAddress) {
    return {
      ok: false,
      skipped: true,
      error: "Missing RESEND_API_KEY or EMAIL_FROM_ADDRESS"
    };
  }

  const email = buildLeadWelcomeEmail(payload, {
    fromName,
    intakeUrl
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: `${fromName} <${fromAddress}>`,
      to: [payload.email],
      subject: email.subject,
      text: email.text,
      html: email.html
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || result.error || `Resend request failed: ${response.status}`);
  }

  return {
    ok: true,
    subject: email.subject,
    id: result.id
  };
}
