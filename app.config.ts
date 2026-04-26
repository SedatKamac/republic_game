import { defineConfig } from 'vinxi/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

export default defineConfig({
  routers: [
    {
      name: 'public',
      type: 'static',
      dir: './public',
      base: '/',
    },
    {
      name: 'client',
      type: 'client',
      handler: './src/entry-client.tsx',
      target: 'browser',
      base: '/',
    },
    {
      name: 'ssr',
      type: 'ssr',
      handler: './src/entry-server.tsx',
    },
  ],
})
