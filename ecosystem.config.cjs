const { readFileSync } = require("fs");
const { resolve } = require("path");

function loadEnv() {
  const envFile = resolve(__dirname, ".env");
  const vars = {};
  try {
    const lines = readFileSync(envFile, "utf8").split("\n");
    for (const line of lines) {
      const eqIdx = line.indexOf("=");
      if (eqIdx === -1 || line.startsWith("#")) continue;
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key) vars[key] = val;
    }
  } catch {}
  return vars;
}

const env = loadEnv();

module.exports = {
  apps: [
    {
      name: "script-workspace",
      cwd: "/root/projects/site/script.workspace/apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3002",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        BETTER_AUTH_URL: "https://script.yomimovie.art",
        NEXT_PUBLIC_COLLAB_WS_URL: "wss://script.yomimovie.art/ws",
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      error_file: "/root/.pm2/logs/script-workspace-error.log",
      out_file: "/root/.pm2/logs/script-workspace-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
    {
      name: "script-admin",
      cwd: "/root/projects/site/script.workspace/apps/admin",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3003",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        ADMIN_LOGIN: env.ADMIN_LOGIN || "",
        ADMIN_PASSWORD: env.ADMIN_PASSWORD || "",
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "256M",
      error_file: "/root/.pm2/logs/script-admin-error.log",
      out_file: "/root/.pm2/logs/script-admin-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
    {
      name: "script-collab",
      cwd: "/root/projects/site/script.workspace/apps/collab",
      script: "src/index.ts",
      interpreter: "/root/projects/site/script.workspace/apps/collab/node_modules/.bin/tsx",
      env: {
        NODE_ENV: "production",
        COLLAB_PORT: "3004",
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "256M",
      error_file: "/root/.pm2/logs/script-collab-error.log",
      out_file: "/root/.pm2/logs/script-collab-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
