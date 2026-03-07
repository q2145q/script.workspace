import "dotenv/config";
import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { Logger } from "@hocuspocus/extension-logger";
import { authenticateConnection } from "./auth.js";
import { loadDocument, storeDocument } from "./persistence.js";
import { checkPermissions } from "./permissions.js";
import { logActivity, logJoinLeave } from "./activity.js";

const port = parseInt(process.env.COLLAB_PORT || "3004");

const server = Server.configure({
  port,
  quiet: false,
  // Debounce persistence writes: wait 5s after last change, max 30s
  debounce: 5000,
  maxDebounce: 30000,

  // onConnect fires BEFORE onAuthenticate in Hocuspocus v2,
  // so we do nothing here — auth & permissions are in onAuthenticate.
  async onConnect() {
    // no-op: context not yet available
  },

  async onAuthenticate(data) {
    // 1. Authenticate user from cookies
    const result = await authenticateConnection({
      requestHeaders: data.requestHeaders,
    });

    // 2. Check permissions (must happen here, not in onConnect)
    await checkPermissions({
      documentName: data.documentName,
      context: { user: result.user },
      connection: data.connection,
    });

    // 3. Log join
    logJoinLeave("join", data.documentName, result.user).catch(console.error);

    // IMPORTANT: Return context additions — Hocuspocus merges them into
    // hookPayload.context via callback. Mutating data.context does NOT work
    // because data is a shallow copy and hookPayload.context gets reassigned.
    return { user: result.user };
  },

  async onChange(data) {
    const context = data.context as { user: { id: string; name: string; email: string } };
    logActivity({
      documentName: data.documentName,
      context,
    }).catch(console.error);
  },

  async onDisconnect(data) {
    const user = (data.context as { user: { id: string; name: string; email: string } })?.user;
    if (user) {
      logJoinLeave("leave", data.documentName, user).catch(console.error);
    }
  },

  extensions: [
    new Logger(),
    new Database({
      fetch: async ({ documentName }) => {
        return loadDocument({ documentName });
      },
      store: async ({ documentName, state }) => {
        try {
          await storeDocument({ documentName, state });
        } catch (error) {
          console.error(
            `[collab] Failed to store ${documentName} after all retries:`,
            error instanceof Error ? error.message : error,
          );
          // Don't throw — Hocuspocus will keep the Y.Doc in memory
          // and retry on next change. Throwing crashes the connection.
        }
      },
    }),
  ],
});

server.listen();

console.log(`Collab server running on port ${port}`);
