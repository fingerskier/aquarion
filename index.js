#!/usr/bin/env node

/*
Process
1. Read the config file
2. Download the app package
   a. construct the URL
   b. handle the request
3. Install the app package
   a. unzip the package
   b. run post-install commands
   c. setup the "installedCommand" per the OS (if possible)
*/

import fs from 'fs'
import http from 'http'
import https from 'https'
import { exec } from 'child_process'
import path from 'path'
import unzipper from 'unzipper'

if (process.argv.length < 3) {
  console.error(`Usage: aquarion <config-file>
  
  config-file possibilities:
  
  {
    remote: "https://some.server.com",
    authHeader: "Authorize somesuchanwhathaveyou",
    timeout: 5,
    getCredentials: "api_key=1234",
    basicCredentials: "user:password",
    directory: "./test/app",
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
  
  const { remote, installDirectory, postInstall, authHeader, timeout, getCredentials, basicAuth } = config
  
  const DEFAULT_TIMEOUT = 10 // Default timeout in seconds
  const effectiveTimeout = timeout || DEFAULT_TIMEOUT
  
  if (!remote || !installDirectory || !postInstall) {
    console.error('Config file must include "remote", "installDirectory", and "postInstall" properties.')
    process.exit(1)
  }

  let formattedRemote = remote
  if (getCredentials) {
    const url = new URL(remote)
    if (typeof getCredentials === 'string') {
      const [key, value] = getCredentials.split('=')
      if (key && value) {
        url.searchParams.append(key, value)
      }
    } else if (Array.isArray(getCredentials) && getCredentials.length === 2) {
      const [key, value] = getCredentials
      if (key && value) {
        url.searchParams.append(key, value)
      }
    }
    formattedRemote = url.toString()
  }
  
  const downloadFile = (url, dest, timeout) => {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest)
      const protocol = url.startsWith('https') ? https : http
      
      const options = new URL(url)
      options.headers = {}

      if (authHeader) {
        options.headers.Authorization = authHeader
      }

      if (basicAuth) {
        options.headers.Authorization = `Basic ${Buffer.from(basicAuth).toString('base64')}`
      }
      
      const request = protocol.get(options, (response) => {
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

      if (timeout) {
        request.setTimeout(timeout * 1000, () => {
          request.abort()
          reject(new Error(`Download timed out after ${timeout} seconds`))
        })
      }
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
      await downloadFile(formattedRemote, zipPath, effectiveTimeout)
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