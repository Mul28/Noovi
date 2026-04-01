export type ParsedLead = {
  name: string;
  email: string;
  trade: string;
  message: string;
};

const INVALID_EMAILS = new Set(["", "unknown", "no email"]);

export function parseLead(description: string): ParsedLead {
  const fields: Record<string, string> = {};

  for (const line of description.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    fields[key] = value;
  }

  const rawEmail = (fields.email || "").trim();
  const normalizedEmail = INVALID_EMAILS.has(rawEmail.toLowerCase()) ? "" : rawEmail;

  return {
    name: fields.name || "",
    email: normalizedEmail,
    trade: fields.trade || "",
    message: fields.message || ""
  };
}
