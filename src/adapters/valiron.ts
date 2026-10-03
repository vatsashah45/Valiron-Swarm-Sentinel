// Deliberately no fabricated SDK calls or verification status.
export const valironStatus = {
  status: "not_connected",
  description:
    "Optional identity enrichment. Public SDK version and a live proof flow must be verified before enabling.",
  detectionDependency: false,
} as const;
