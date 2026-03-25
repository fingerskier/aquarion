import 'dotenv/config.js'

import express from 'express'

import apiKeyAuth from './auth.js'
import downloader from './download.js'
import getKey from './getKey.js'

const app = express()

global.keys = {}


app.use(express.static('public'))

// Unauthenticated download (for basic testing)
app.get('/download', downloader)

// Authenticated download (requires API key)
app.get('/downloadApp', apiKeyAuth, downloader)

app.get('/getConfig', getKey)


// Start the server
const PORT = process.env.PORT || 3000

const server = app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`)
})

export { app, server }