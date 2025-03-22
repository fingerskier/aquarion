import fs from 'fs';
import path from 'path';
import archiver from 'archiver'

const __dirname = path.resolve()


/**
 * Zips a folder and returns the path to the ZIP file.
 * @param {string} folderPath - The path to the folder to zip.
 * @param {string} [outputPath] - The optional path to save the ZIP file.
 * @returns {Promise<string>} - The path to the created ZIP file.
 */
export async function zipFolder(folderPath, outputPath) {
  return new Promise((resolve, reject) => {
    // Ensure the folder exists
    if (!fs.existsSync(folderPath)) {
      return reject(new Error('Folder does not exist'));
    }

    // Default output path if not provided
    const folderName = path.basename(folderPath);
    outputPath = outputPath || path.join(process.cwd(), `${folderName}.zip`);

    // Create a file stream for the ZIP file
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`ZIP file created: ${outputPath} (${archive.pointer()} bytes)`);
      resolve(outputPath);
    });

    output.on('error', (err) => reject(err));
    archive.on('error', (err) => reject(err));

    // Pipe archive data to the file stream
    archive.pipe(output);

    // Append files and directories to the archive
    archive.directory(folderPath, false);

    // Finalize the archive
    archive.finalize();
  });
}


export const downloader = async(req, res)=>{
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


export const getter = type=>{
  return async(req, res)=>{
    try {
      const newKey = Math.random().toString(36).substring(2, 4) + Math.random().toString(36).substring(2, 4)
      const origin = req.query.origin
      global.keys[origin] = newKey
      
      console.log(global.keys)
      
      let config = {}
      if (type === 'basic') {
        config = {
          "remote": "http://localhost:3000/download/basic",
          "timeout": 60,
          "basicCredentials": `${origin}:${newKey}`
        }
      } else if (type === 'key') {
        config = {
          "remote": "http://localhost:3000/download/key",
          "timeout": 60,
          "getCredentials": "api_key="+newKey,
          "installDirectory": "./test/app",
          "postInstall": [
            "npm i",
            "echo second arbitrary command"
          ],
          "runCommand": "node ."
        }
      }
      
      // Write config object to file and send it
      const configString = JSON.stringify(config, null, 2)
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="config_${type}.json"`)
      res.send(configString)
    } catch (error) {
      console.error('Error:', error.message)
    } finally {
      console.log('/get fin')
    }
  }
}


// // Example usage
// (async () => {
//   try {
//     const zipPath = await zipFolder('./myFolder');
//     console.log('ZIP file saved at:', zipPath);
//   } catch (error) {
//     console.error('Error:', error.message);
//   }
// })();
