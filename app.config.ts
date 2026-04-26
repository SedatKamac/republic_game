import { createApp } from 'vinxi'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default createApp({
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
      type: 'http',
      handler: './src/entry-server.tsx',
      target: 'server',
      plugins: () => [tanstackStart()],
    },
  ],
  plugins: [
    tsconfigPaths(),
  ],
})
