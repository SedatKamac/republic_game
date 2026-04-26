import { listen } from 'vinxi/listen'
import { createApp, eventHandler, toNodeListener, toWebRequest } from 'h3'
import serveStatic from 'serve-static'
import { join } from 'node:path'
import server from './dist/server/server.js'

const app = createApp()
const clientDir = join(process.cwd(), 'dist/client')

// 1. SSR Handler (React rendering)
app.use(eventHandler(async (event) => {
  try {
    const request = toWebRequest(event)
    const response = await server.fetch(request)
    return response
  } catch (err) {
    console.error(`[SSR Error] ${err.message}`)
    return 'Internal Server Error'
  }
}))

// 2. Static Middleware (CSS, JS, Images)
const staticMiddleware = serveStatic(clientDir, { 
  index: false,
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css')
    }
  }
})

const nodeListener = toNodeListener(app)

// 3. Combined Listener (Static first, then SSR)
const combinedListener = (req, res) => {
  staticMiddleware(req, res, (err) => {
    if (err) {
      res.statusCode = 500
      res.end('Internal Server Error')
      return
    }
    nodeListener(req, res)
  })
}

console.log('🚀 Starting Republic Game Server (Static + SSR)...')

listen(combinedListener, {
  port: process.env.PORT || 3000
}).then(() => {
  console.log(`✅ Server is live and serving assets on port ${process.env.PORT || 3000}`)
}).catch(err => {
  console.error('❌ Startup failed:', err)
  process.exit(1)
})
