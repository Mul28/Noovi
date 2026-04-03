function getRequiredEnv(env, name) {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function hasPaperclipConfig(env = process.env) {
  return Boolean(env.PAPERCLIP_API_URL && env.PAPERCLIP_API_KEY && env.PAPERCLIP_COMPANY_ID);
}

export async function paperclipRequest(path, init = {}, env = process.env) {
  const apiUrl = getRequiredEnv(env, "PAPERCLIP_API_URL").replace(/\/$/, "");
  const apiKey = getRequiredEnv(env, "PAPERCLIP_API_KEY");

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...init.headers
  };

  if (env.PAPERCLIP_RUN_ID) {
    headers["X-Paperclip-Run-Id"] = env.PAPERCLIP_RUN_ID;
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Paperclip request failed: ${response.status} ${errorText}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function createIssue(issuePayload, env = process.env) {
  if (!hasPaperclipConfig(env)) {
    return { dryRun: true, issuePayload };
  }

  const companyId = getRequiredEnv(env, "PAPERCLIP_COMPANY_ID");
  const issue = await paperclipRequest(
    `/api/companies/${companyId}/issues`,
    {
      method: "POST",
      body: JSON.stringify(issuePayload)
    },
    env
  );

  return { dryRun: false, issue, issuePayload };
}

export async function getIssue(issueId, env = process.env) {
  return paperclipRequest(`/api/issues/${issueId}`, {}, env);
}

export async function getIssueByIdentifier(identifier, env = process.env) {
  if (!hasPaperclipConfig(env)) {
    return null;
  }

  const companyId = getRequiredEnv(env, "PAPERCLIP_COMPANY_ID");
  const issues = await paperclipRequest(
    `/api/companies/${companyId}/issues?query=${encodeURIComponent(identifier)}`,
    {},
    env
  );

  return issues.find((issue) => issue.identifier === identifier) || null;
}

export async function listChildIssues(parentId, env = process.env) {
  if (!hasPaperclipConfig(env)) {
    return [];
  }

  const companyId = getRequiredEnv(env, "PAPERCLIP_COMPANY_ID");
  return paperclipRequest(
    `/api/companies/${companyId}/issues?parentId=${encodeURIComponent(parentId)}`,
    {},
    env
  );
}

export async function listIssueComments(issueId, env = process.env) {
  if (!hasPaperclipConfig(env)) {
    return [];
  }

  return paperclipRequest(`/api/issues/${issueId}/comments`, {}, env);
}

export async function addIssueComment(issueId, body, env = process.env) {
  if (!hasPaperclipConfig(env)) {
    return { skipped: true };
  }

  return paperclipRequest(
    `/api/issues/${issueId}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ body })
    },
    env
  );
}

export async function updateIssueStatus(issueId, status, env = process.env) {
  if (!hasPaperclipConfig(env)) {
    return { skipped: true };
  }

  return paperclipRequest(
    `/api/issues/${issueId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status })
    },
    env
  );
}
