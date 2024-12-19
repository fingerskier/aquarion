import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

/**
 * Zips a folder and returns the path to the ZIP file.
 * @param {string} folderPath - The path to the folder to zip.
 * @param {string} [outputPath] - The optional path to save the ZIP file.
 * @returns {Promise<string>} - The path to the created ZIP file.
 */
async function zipFolder(folderPath, outputPath) {
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

export default zipFolder;

// // Example usage
// (async () => {
//   try {
//     const zipPath = await zipFolder('./myFolder');
//     console.log('ZIP file saved at:', zipPath);
//   } catch (error) {
//     console.error('Error:', error.message);
//   }
// })();
