import path from 'path'
import zipFolder from './zipFolder.js'

const __dirname = path.resolve()


export default async function downloader(req, res) {
  try {
    const sourcePath = path.join(__dirname, '..', 'eg')
    const targetPath = path.join(__dirname, 'eq.zip')
    
    const file = await zipFolder(sourcePath, targetPath)
    
    
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
}