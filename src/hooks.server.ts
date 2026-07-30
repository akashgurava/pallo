import { ready } from "$lib/server/db/index.js";
import { createLogger } from "$lib/server/logger.js";

const log = createLogger("server");

await ready();
log.info("server started, migrations applied");
