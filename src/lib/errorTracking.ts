import posthog from "posthog-js";

export function captureError(
  error: unknown,
  context: Record<string, unknown>,
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  posthog.captureException(err, context);
}
