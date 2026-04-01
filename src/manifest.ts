const manifest = {
  name: "@noovi/head-of-growth-tools",
  version: "0.1.0",
  description: "Deterministic tools for Noovi Head of Growth.",
  workers: [
    {
      name: "head-of-growth-tools",
      entry: "./src/worker.ts"
    }
  ]
};

export default manifest;
