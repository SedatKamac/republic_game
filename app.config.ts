import { defineConfig } from 'vinxi'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

export default defineConfig({
  plugins: [
    tsconfigPaths(),
  ],
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
      plugins: () => [tanstackStart()],
      base: '/',
    },
    {
      name: 'ssr',
      type: 'ssr',
      handler: './src/entry-server.tsx',
      plugins: () => [tanstackStart()],
    },
  ],
})
