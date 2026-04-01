export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
  html: string;
};

export type SendEmailResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const response = await fetch("http://127.0.0.1:3300/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const result = (await response.json()) as SendEmailResult;

  if (!response.ok || !result.ok) {
    throw new Error(result.error || `Email send failed: ${response.status}`);
  }

  return result;
}
