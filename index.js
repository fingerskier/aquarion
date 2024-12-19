#!/usr/bin/env node

import fs from 'fs'
import http from 'http'
import https from 'https'
import { exec } from 'child_process'
import path from 'path'
import unzipper from 'unzipper'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

if (process.argv.length < 3) {
  console.error(`Usage: aquarion <config-file>
  
  config-file possibilities:
  
  {
    remote: "https://some.server.com",
    authHeader: "Authorize somesuchanwhathaveyou",
    getCredentials: "api_key=1234",
    basicCredentials: "user:password",
    directory: "./test/app",
    preInstall: "npm install",
    postInstall: ["npm run build", "npm start"],
    installedCommand: "best-app-ever",
  }
`)
  
  process.exit(1)
}

const configPath = process.argv[2]

// Read config file
fs.readFile(configPath, 'utf8', (err, data) => {
  if (err) {
    console.error(`Failed to read config file: ${err.message}`)
    process.exit(1)
  }
  
  let config
  try {
    config = JSON.parse(data)
  } catch (parseErr) {
    console.error(`Failed to parse config file: ${parseErr.message}`)
    process.exit(1)
  }
  
  const { remote, installDirectory, postInstall } = config
  
  if (!remote || !installDirectory || !postInstall) {
    console.error('Config file must include "remote", "installDirectory", and "postInstall" properties.')
    process.exit(1)
  }
  
  const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest)
      const protocol = url.startsWith('https') ? https : http
      
      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status code: ${response.statusCode}`))
          return
        }
        
        response.pipe(file)
        file.on('finish', () => {
          file.close(resolve)
        })
      }).on('error', (downloadErr) => {
        fs.unlink(dest, () => reject(downloadErr))
      })
    })
  }
  
  const zipPath = path.join(installDirectory, 'download.zip')
  
  // Ensure the directory exists
  fs.mkdir(installDirectory, { recursive: true }, async (mkdirErr) => {
    if (mkdirErr) {
      console.error(`Failed to create directory: ${mkdirErr.message}`)
      process.exit(1)
    }
    
    try {
      console.log('Downloading file...')
      await downloadFile(remote, zipPath)
      console.log('Download complete. Unzipping file...')
      
      await new Promise((resolve, reject) => {
        fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: installDirectory }))
        .on('close', resolve)
        .on('error', reject)
      })
      
      console.log('Unzip complete. Running postInstall commands...')
      
      const commands = Array.isArray(postInstall) ? postInstall : [postInstall]
      
      for (const command of commands) {
        console.log(`Executing: ${command}`)
        await new Promise((resolve, reject) => {
          exec(command, { cwd: installDirectory }, (execErr, stdout, stderr) => {
            if (execErr) {
              reject(new Error(`Failed to execute command: ${command}, error: ${execErr.message}`))
              return
            }
            
            console.log(stdout)
            if (stderr) {
              console.error(stderr)
            }
            resolve()
          })
        })
      }
      
      console.log('All postInstall commands executed successfully.')
    } catch (err) {
      console.error(err.message)
      process.exit(1)
    }
  })
})