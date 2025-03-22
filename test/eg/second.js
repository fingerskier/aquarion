import fs from 'fs'
import path from 'path'

const __dirname = path.resolve()  

export default function second() {
  // read randomFile.txt
  const randomFile = fs.readFileSync(path.join(__dirname, 'randomFile.txt'), 'utf8')
  console.log(randomFile)
}