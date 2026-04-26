import { listen } from 'vinxi/listen'
import { createApp, eventHandler, fromNodeMiddleware, toNodeListener, toWebRequest } from 'h3'
import serveStatic from 'serve-static'
import { join } from 'node:path'
import server from './dist/server/server.js'

const app = createApp()

// 1. Serve static files from dist/client
const staticMiddleware = serveStatic(join(process.cwd(), 'dist/client'), {
  index: false,
})
app.use(fromNodeMiddleware(staticMiddleware))

// 2. Handle everything else with TanStack Start SSR
app.use(eventHandler(async (event) => {
  const request = toWebRequest(event)
  const response = await server.fetch(request)
  return response
}))

console.log('🚀 Starting Republic Game Server with Static Assets...')

listen(toNodeListener(app), {
  port: process.env.PORT || 3000
}).then(() => {
  console.log(`✅ Server is live and serving assets on port ${process.env.PORT || 3000}`)
}).catch(err => {
  console.error('❌ Failed to start server:', err)
  process.exit(1)
})
