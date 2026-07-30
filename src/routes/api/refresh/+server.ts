import { resetDatabase, stampRefresh } from "$lib/server/db/reset.js";
import { runListScrape } from "$lib/server/scraper/run-list.js";
import { runMountsScrape } from "$lib/server/scraper/run-mounts.js";
import { runDetailScrape } from "$lib/server/scraper/run-details.js";
import { runBreedingScrape } from "$lib/server/scraper/run-breeding.js";
import { createLogger } from "$lib/server/logger.js";
import type { RequestHandler } from "./$types.js";

const log = createLogger("api:refresh");

export const POST: RequestHandler = async () => {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      function send(data: {
        progress: number;
        message: string;
        failed?: boolean;
        done?: boolean;
      }): void {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      async function run(): Promise<void> {
        try {
          log.info("refresh started");

          send({ progress: 0, message: "Resetting database..." });
          await resetDatabase();
          send({ progress: 2, message: "Database reset" });

          await runListScrape((message, progress) => send({ progress, message }), 2, 10);

          await runMountsScrape((message, progress) => send({ progress, message }), 10, 20);

          await runDetailScrape(
            (message, progress) => send({ progress, message }),
            (message) => send({ progress: -1, message, failed: true }),
            20,
            59,
          );

          await runBreedingScrape(
            (message, progress) => send({ progress, message }),
            (message) => send({ progress: -1, message, failed: true }),
            59,
            98,
          );

          await stampRefresh();
          send({ progress: 100, message: "Complete", done: true });
          log.info("refresh complete");
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          log.error("refresh failed", { error: message });
          send({ progress: -1, message: `Error: ${message}`, done: true });
        } finally {
          controller.close();
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
