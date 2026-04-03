import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  addIssueComment,
  createIssue,
  getIssue,
  listChildIssues,
  listIssueComments,
  updateIssueStatus
} from "./paperclip.mjs";
import {
  buildGoLiveIssuePayload,
  buildPreviewUrl,
  buildReviewIssuePayload,
  buildRevisionIssuePayload,
  extractBuildPayload,
  extractPreviewUrl,
  extractRevisionRound,
  findExistingGoLiveIssue,
  findExistingReviewIssue,
  findExistingRevisionIssue
} from "./review.mjs";

const execFileAsync = promisify(execFile);

function buildIssueLink(issue) {
  return `[${issue.identifier}](/NOO/issues/${issue.identifier})`;
}

async function getBuildContext(buildIssueId, env = process.env) {
  const buildIssue = await getIssue(buildIssueId, env);
  const payload = extractBuildPayload(buildIssue.description || "");
  const children = await listChildIssues(buildIssue.id, env);

  return { buildIssue, payload, children };
}

export async function ensureReviewIssueForContent(contentIssueId, config = {}, env = process.env) {
  const contentIssue = await getIssue(contentIssueId, env);
  if (!contentIssue.parentId) {
    throw new Error("CONTENT issue does not have a parent BUILD issue");
  }

  const { buildIssue, payload, children } = await getBuildContext(contentIssue.parentId, env);
  const existing = findExistingReviewIssue(children);
  const previewUrl = buildPreviewUrl(buildIssue, config, env);

  if (existing) {
    await addIssueComment(
      buildIssue.id,
      `REVIEW issue already exists: ${buildIssueLink(existing)}. Preview URL remains ${previewUrl}.`,
      env
    );

    return { created: false, reviewIssue: existing, buildIssue, contentIssue, previewUrl };
  }

  const issuePayload = buildReviewIssuePayload(payload, buildIssue, contentIssue, {
    assigneeAgentId: env.HEAD_OF_GROWTH_AGENT_ID,
    publicBaseUrl: config.publicBaseUrl
  }, env);
  const result = await createIssue(issuePayload, env);

  if (result.dryRun) {
    return {
      created: true,
      dryRun: true,
      reviewIssue: null,
      buildIssue,
      contentIssue,
      previewUrl,
      issuePayload: result.issuePayload
    };
  }

  await addIssueComment(
    result.issue.id,
    [
      "Preview is ready for review.",
      "Send the preview-ready email using:",
      '`node skills/noovi-growth-email/scripts/send_issue_email.mjs --issue-id "$PAPERCLIP_TASK_ID" --email-type preview_ready`',
      "If the client requests changes, record them through the deterministic review decision flow."
    ].join("\n"),
    env
  );
  await addIssueComment(
    buildIssue.id,
    `Created REVIEW handoff: ${buildIssueLink(result.issue)} with preview URL ${previewUrl}.`,
    env
  );

  return { created: true, reviewIssue: result.issue, buildIssue, contentIssue, previewUrl };
}

export async function sendPreviewReadyEmail(reviewIssueId, env = process.env) {
  const scriptPath = "skills/noovi-growth-email/scripts/send_issue_email.mjs";
  const { stdout } = await execFileAsync(process.execPath, [scriptPath, "--issue-id", reviewIssueId, "--email-type", "preview_ready"], {
    cwd: process.cwd(),
    env
  });

  return stdout ? JSON.parse(stdout) : { ok: true };
}

export async function recordReviewDecision(
  reviewIssueId,
  { decision, requestedChanges = "", paymentConfirmed = false, domainTarget = "", liveUrl = "" } = {},
  env = process.env
) {
  const reviewIssue = await getIssue(reviewIssueId, env);
  if (!reviewIssue.parentId) {
    throw new Error("REVIEW issue does not have a parent BUILD issue");
  }

  const { buildIssue, payload, children } = await getBuildContext(reviewIssue.parentId, env);
  const previewUrl = extractPreviewUrl(reviewIssue.description || "") || buildPreviewUrl(buildIssue, {}, env);

  if (decision === "changes_requested") {
    const existingRevision = findExistingRevisionIssue(children);
    const nextRound = Math.max(extractRevisionRound(reviewIssue.description || ""), 0) + 1;

    if (existingRevision) {
      await addIssueComment(
        reviewIssue.id,
        `Using existing REVISIONS issue ${buildIssueLink(existingRevision)} for the current change request.`,
        env
      );

      return { action: "revision_reused", reviewIssue, buildIssue, relatedIssue: existingRevision, previewUrl };
    }

    const payloadForRevision = buildRevisionIssuePayload(
      payload,
      buildIssue,
      reviewIssue,
      requestedChanges,
      nextRound,
      { assigneeAgentId: env.HEAD_OF_DELIVERY_AGENT_ID },
      env
    );
    const result = await createIssue(payloadForRevision, env);

    await addIssueComment(
      reviewIssue.id,
      `Client requested changes. Created REVISIONS handoff: ${buildIssueLink(result.issue)}.`,
      env
    );
    await addIssueComment(
      buildIssue.id,
      `Revision round ${nextRound} created: ${buildIssueLink(result.issue)}.`,
      env
    );

    return { action: "revision_created", reviewIssue, buildIssue, relatedIssue: result.issue, previewUrl };
  }

  if (decision === "approved") {
    if (!paymentConfirmed) {
      await addIssueComment(
        reviewIssue.id,
        "Client approved the preview. Awaiting payment before go-live.",
        env
      );

      return { action: "awaiting_payment", reviewIssue, buildIssue, previewUrl };
    }

    const existingGoLive = findExistingGoLiveIssue(children);
    if (existingGoLive) {
      await addIssueComment(
        reviewIssue.id,
        `GOLIVE issue already exists: ${buildIssueLink(existingGoLive)}.`,
        env
      );

      return { action: "golive_reused", reviewIssue, buildIssue, relatedIssue: existingGoLive, previewUrl };
    }

    const payloadForGoLive = buildGoLiveIssuePayload(
      payload,
      buildIssue,
      reviewIssue,
      {
        assigneeAgentId: env.HEAD_OF_DELIVERY_AGENT_ID,
        domainTarget,
        liveUrl
      },
      env
    );
    const result = await createIssue(payloadForGoLive, env);

    await addIssueComment(
      reviewIssue.id,
      `Client approved and payment confirmed. Created GOLIVE handoff: ${buildIssueLink(result.issue)}.`,
      env
    );
    await addIssueComment(
      buildIssue.id,
      `Go-live handoff created: ${buildIssueLink(result.issue)}.`,
      env
    );

    return { action: "golive_created", reviewIssue, buildIssue, relatedIssue: result.issue, previewUrl };
  }

  throw new Error(`Unsupported review decision: ${decision}`);
}

export async function completeRevisionIssue(
  revisionIssueId,
  { updatedPreviewUrl = "" } = {},
  env = process.env
) {
  const revisionIssue = await getIssue(revisionIssueId, env);
  if (!revisionIssue.parentId) {
    throw new Error("REVISIONS issue does not have a parent BUILD issue");
  }

  const { buildIssue, children } = await getBuildContext(revisionIssue.parentId, env);
  const reviewIssue = findExistingReviewIssue(children);
  if (!reviewIssue) {
    throw new Error("No REVIEW issue exists for this BUILD issue");
  }

  const previewUrl = updatedPreviewUrl || extractPreviewUrl(reviewIssue.description || "") || buildPreviewUrl(buildIssue, {}, env);
  const nextRound = Math.max(extractRevisionRound(reviewIssue.description || ""), 0) + 1;

  await addIssueComment(
    reviewIssue.id,
    `Revision round ${nextRound} completed. Updated preview is ready at ${previewUrl}.`,
    env
  );
  await addIssueComment(
    buildIssue.id,
    `Revision round ${nextRound} completed. REVIEW issue ${buildIssueLink(reviewIssue)} is ready again.`,
    env
  );
  await updateIssueStatus(revisionIssue.id, "done", env);

  return { buildIssue, reviewIssue, revisionIssue, previewUrl, revisionRound: nextRound };
}

export async function completeGoLiveIssue(
  goliveIssueId,
  { liveUrl, sendEmail = false } = {},
  env = process.env
) {
  if (!liveUrl) {
    throw new Error("liveUrl is required to complete go-live");
  }

  const goliveIssue = await getIssue(goliveIssueId, env);
  if (!goliveIssue.parentId) {
    throw new Error("GOLIVE issue does not have a parent BUILD issue");
  }

  const { buildIssue, children } = await getBuildContext(goliveIssue.parentId, env);
  const reviewIssue = findExistingReviewIssue(children);
  if (!reviewIssue) {
    throw new Error("No REVIEW issue exists for this BUILD issue");
  }

  await addIssueComment(goliveIssue.id, `Website launched successfully.\nLive URL: ${liveUrl}`, env);
  await addIssueComment(reviewIssue.id, `Website is now live.\nLive URL: ${liveUrl}`, env);
  await addIssueComment(buildIssue.id, `Go-live completed.\nLive URL: ${liveUrl}`, env);

  await updateIssueStatus(goliveIssue.id, "done", env);
  await updateIssueStatus(reviewIssue.id, "done", env);
  await updateIssueStatus(buildIssue.id, "done", env);

  if (sendEmail) {
    await addIssueComment(
      reviewIssue.id,
      `Go-live email should be sent with live URL ${liveUrl}.`,
      env
    );
  }

  return { buildIssue, reviewIssue, goliveIssue, liveUrl };
}
