import { resetDatabase, stampRefresh } from "$lib/server/db/reset";
import { runPalsOrchestrator, runBreedingOrchestrator } from "$lib/server/scraper/orchestrators";
import { createLogger } from "$lib/server/logger";
import type { RequestHandler } from "./$types";

const log = createLogger("api:refresh");

export const POST: RequestHandler = async ({ url }) => {
  const target = url.searchParams.get("target"); // "pals" | "breeding" | null (all)
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      function send(data: {
        progress: number;
        message: string;
        failed?: boolean;
        done?: boolean;
      }): void {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          log.debug("failed to enqueue SSE data", { error: String(e) });
        }
      }

      function handleFail(message: string): void {
        send({ progress: -1, message, failed: true });
      }

      async function run(): Promise<void> {
        try {
          log.info("refresh started", { target: target || "all" });

          if (target === "pals") {
            await runPalsOrchestrator(
              (message, progress) => send({ progress, message }),
              handleFail,
            );
          } else if (target === "breeding") {
            await runBreedingOrchestrator(
              (message, progress) => send({ progress, message }),
              handleFail,
            );
          } else {
            send({ progress: 0, message: "Resetting database..." });
            await resetDatabase();
            send({ progress: 2, message: "Database reset" });

            await runPalsOrchestrator(
              (message, progress) => send({ progress: Math.round(progress * 0.7), message }),
              handleFail,
            );
            await runBreedingOrchestrator(
              (message, progress) => send({ progress: 70 + Math.round(progress * 0.28), message }),
              handleFail,
            );
          }

          await stampRefresh();
          send({ progress: 100, message: "Complete", done: true });
          log.info("refresh complete", { target: target || "all" });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          log.error("refresh failed", { target: target || "all", error: message });
          send({ progress: -1, message: `Error: ${message}`, done: true });
        } finally {
          try {
            controller.close();
          } catch (e) {
            log.debug("controller already closed in finally", { error: String(e) });
          }
        }
      }

      run();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
