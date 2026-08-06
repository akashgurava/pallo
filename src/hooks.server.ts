import { ready } from "$lib/server/db/index";
import { createLogger } from "$lib/server/logger";

const log = createLogger("server");

await ready();
log.info("server started, migrations applied");
