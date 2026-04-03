#!/usr/bin/env node

import { recordReviewDecision } from "../../../intake-form/lib/review-workflow.mjs";

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

function parseBoolean(value) {
  return value === "true";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const reviewIssueId = args["review-issue-id"];
  const decision = args.decision;

  if (!reviewIssueId) {
    throw new Error("Missing required argument: --review-issue-id");
  }

  if (!decision) {
    throw new Error("Missing required argument: --decision");
  }

  const result = await recordReviewDecision(
    reviewIssueId,
    {
      decision,
      requestedChanges: args["requested-changes"] || "",
      paymentConfirmed: parseBoolean(args["payment-confirmed"] || "false"),
      domainTarget: args["domain-target"] || "",
      liveUrl: args["live-url"] || ""
    },
    process.env
  );

  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
