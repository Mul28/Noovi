const manifest = {
  name: "@noovi/head-of-growth-tools",
  version: "0.1.0",
  description: "Deterministic tools for Noovi Head of Growth.",
  workers: [
    {
      name: "head-of-growth-tools",
      entry: "./src/worker.ts",
      actions: [
        "send_welcome_email_for_issue",
        "send_intake_reminder_email_for_issue",
        "send_preview_ready_email_for_issue"
      ]
    }
  ]
};

export default manifest;
