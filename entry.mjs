import { listen } from 'vinxi/listen'
import server from './dist/server/server.js'

console.log('Starting TanStack Start server...')

listen(server.fetch, {
  port: process.env.PORT || 3000
}).then(() => {
  console.log(`Server listening on port ${process.env.PORT || 3000}`)
}).catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
