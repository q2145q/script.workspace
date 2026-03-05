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
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
    },
    {
      name: "script-admin",
      cwd: "/root/projects/site/script.workspace/apps/admin",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3003",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "256M",
    },
  ],
};
