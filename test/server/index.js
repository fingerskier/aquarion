import 'dotenv/config.js'

import authMiddleware from './authauth.js'
import download from './download.js'
import express from 'express'
import path from 'path'

const __dirname = path.resolve()
const app = express()


app.use(authMiddleware)


app.get('/download', async(req, res)=>{
  try {
    const sourcePath = path.join(__dirname, '..', 'eg')
    const targetPath = path.join(__dirname, 'eq.zip')
    
    const file = await download(sourcePath, targetPath)
    
    
    res.download(file, targetPath, (err) => {
      if (err) {
        console.error('Error sending file:', err)
      } else {
        console.log('File sent successfully!')
      }
    })
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    console.log('/download fin')
  }
})


// Start the server
const PORT = 3000

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`)
})