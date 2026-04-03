#!/usr/bin/env node

import { ensureReviewIssueForContent, sendPreviewReadyEmail } from "../../../intake-form/lib/review-workflow.mjs";

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const contentIssueId = args["content-issue-id"];
  const sendEmail = args["send-email"] !== "false";

  if (!contentIssueId) {
    throw new Error("Missing required argument: --content-issue-id");
  }

  const result = await ensureReviewIssueForContent(contentIssueId, {}, process.env);

  let emailResult = null;
  if (result.reviewIssue && sendEmail) {
    emailResult = await sendPreviewReadyEmail(result.reviewIssue.id, process.env);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        created: result.created,
        reviewIssueId: result.reviewIssue?.id || null,
        reviewIdentifier: result.reviewIssue?.identifier || null,
        previewUrl: result.previewUrl,
        emailResult
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
