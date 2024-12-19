import path from 'path'


export default function download() {
  // get the contents of ../eg
  const dir = path.join(__dirname, '..', 'eg')
  const files = fs.readdirSync(dir)

  


  const file = path.join(__dirname, '..', 'eg', 'example.zip'); // Path to your .zip file
}