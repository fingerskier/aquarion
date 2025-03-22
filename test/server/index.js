import 'dotenv/config.js'

import {basicAuth, apiKeyAuth} from './middleware.js'
import {downloader, getter} from './implementation.js'
import express from 'express'

const app = express()

global.keys = {}


app.get('/download/apikey', apiKeyAuth, downloader)

app.get('/get/apikey', getter('key'))


// Start the server
const PORT = 3000

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`)
})