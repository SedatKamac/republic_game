// app.config.ts
import { createApp } from "vinxi";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
var app_config_default = createApp({
  routers: [
    {
      name: "public",
      type: "static",
      dir: "./public",
      base: "/"
    },
    {
      name: "client",
      type: "client",
      handler: "./src/entry-client.tsx",
      target: "browser",
      plugins: () => [tsconfigPaths(), tanstackStart()],
      base: "/"
    },
    {
      name: "ssr",
      type: "ssr",
      handler: "./src/entry-server.tsx",
      plugins: () => [tsconfigPaths(), tanstackStart()]
    }
  ]
});
export {
  app_config_default as default
};
