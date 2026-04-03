#!/usr/bin/env node

import { completeGoLiveIssue } from "../../../intake-form/lib/review-workflow.mjs";

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
  const goliveIssueId = args["golive-issue-id"];
  const liveUrl = args["live-url"];

  if (!goliveIssueId) {
    throw new Error("Missing required argument: --golive-issue-id");
  }

  if (!liveUrl) {
    throw new Error("Missing required argument: --live-url");
  }

  const result = await completeGoLiveIssue(
    goliveIssueId,
    {
      liveUrl,
      sendEmail: args["send-email"] === "true"
    },
    process.env
  );

  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
