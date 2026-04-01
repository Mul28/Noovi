export type PaperclipIssue = {
  id: string;
  description?: string | null;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${requireEnv("PAPERCLIP_API_KEY")}`,
    "Content-Type": "application/json"
  };

  if (process.env.PAPERCLIP_RUN_ID) {
    headers["X-Paperclip-Run-Id"] = process.env.PAPERCLIP_RUN_ID;
  }

  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const apiUrl = requireEnv("PAPERCLIP_API_URL").replace(/\/$/, "");
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      ...buildHeaders(),
      ...(init?.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`Paperclip request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function getIssue(issueId: string): Promise<PaperclipIssue> {
  return request<PaperclipIssue>(`/api/issues/${issueId}`);
}

export async function addIssueComment(issueId: string, body: string): Promise<void> {
  await request(`/api/issues/${issueId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body })
  });
}
