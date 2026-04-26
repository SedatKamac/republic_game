import { listen } from 'vinxi/listen'
import { createApp, eventHandler, toNodeListener, toWebRequest } from 'h3'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import server from './dist/server/server.js'

const app = createApp()
const clientDir = join(process.cwd(), 'dist/client')

// 1. Explicit Asset Serving (Brute Force MIME Types)
app.use(eventHandler(async (event) => {
  const url = event.node.req.url
  
  if (url.startsWith('/assets/')) {
    const filePath = join(clientDir, url)
    
    if (existsSync(filePath)) {
      const extension = url.split('.').pop()
      const mimeTypes = {
        'css': 'text/css',
        'js': 'application/javascript',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'svg': 'image/svg+xml',
        'ico': 'image/x-icon',
        'woff': 'font/woff',
        'woff2': 'font/woff2',
      }
      
      const contentType = mimeTypes[extension] || 'application/octet-stream'
      console.log(`[Asset] Serving ${url} as ${contentType}`)
      
      event.node.res.setHeader('Content-Type', contentType)
      event.node.res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      
      return await readFile(filePath)
    } else {
      console.warn(`[Asset] Not found: ${url}`)
    }
  }
}))

// 2. TanStack Start SSR Handler
app.use(eventHandler(async (event) => {
  console.log(`[SSR] Request: ${event.node.req.url}`)
  try {
    const request = toWebRequest(event)
    const response = await server.fetch(request)
    return response
  } catch (err) {
    console.error(`[SSR Error] ${err.message}`)
    return 'Internal Server Error'
  }
}))

console.log('🚀 Starting Republic Game Server (Brute Force Assets)...')

const nodeListener = toNodeListener(app)

listen(nodeListener, {
  port: process.env.PORT || 3000
}).then(() => {
  console.log(`✅ Server live and serving assets on port ${process.env.PORT || 3000}`)
}).catch(err => {
  console.error('❌ Startup failed:', err)
  process.exit(1)
})
