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
import { exec, spawn } from 'child_process'
import path from 'path'
import unzipper from 'unzipper'

if (process.argv.length < 3) {
  console.error(`Usage: aquarion <config-file> [options]
  
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
  
  options:
    update: Download the app regardless of whether it's already installed
`)
  
  process.exit(1)
}

// Get CLI arguments
const [,, configPath, secondArg] = process.argv

// Check for "update" flag (supports both "update" and "--update")
const doingUpdate = secondArg === 'update' || secondArg === '--update'


if (!configPath) {
  console.error('Usage: aquarion <config-file> [update]')
  process.exit(1)
}

// Read config: supports a file path or an inline JSON string
let configData

if (configPath.trimStart().startsWith('{')) {
  // Inline JSON string
  configData = configPath
} else {
  try {
    configData = fs.readFileSync(configPath, 'utf8')
  } catch (readErr) {
    console.error(`Failed to read config file: ${readErr.message}`)
    process.exit(1)
  }
}

let config


try {
  config = JSON.parse(configData)
} catch (parseErr) {
  console.error(`Failed to parse config: ${parseErr.message}`)
  process.exit(1)
}


const { 
  authHeader,
  basicCredentials,
  flush=false,
  getCredentials,
  installDirectory,
  postInstall,
  remote,
  runCommand,
  timeout,
} = config

const DEFAULT_TIMEOUT = 10 // Default timeout in seconds
const effectiveTimeout = timeout || DEFAULT_TIMEOUT

let doDownload = true


// Check if the installDirectory exists
if (fs.existsSync(installDirectory) && !doingUpdate) {
  console.log(`Already installed, skipping download.`)
  
  doDownload = false
}


if (doDownload) {
  if (!remote) {
    console.error(`Config file must include "remote" property - this is host's URL for the app.`)
    process.exit(1)
  }
    
  let formattedRemote = remote
  
  
  if (flush) {
    console.log(`Flushing contents of ${installDirectory}...`)
    fs.rmSync(installDirectory, { recursive: true, force: true })
  }
  
  if (getCredentials) {
    const url = new URL(remote)
    if (typeof getCredentials === 'string') {
      // Support "key=value" or "key=value&key2=value2"
      const pairs = getCredentials.split('&')
      for (const pair of pairs) {
        const [key, ...rest] = pair.split('=')
        const value = rest.join('=')
        if (key && value) {
          url.searchParams.append(key, value)
        }
      }
    } else if (Array.isArray(getCredentials)) {
      if (getCredentials.length === 2 && !Array.isArray(getCredentials[0])) {
        // ["key", "value"]
        const [key, value] = getCredentials
        if (key && value) {
          url.searchParams.append(key, value)
        }
      } else {
        // [["key1", "value1"], ["key2", "value2"]]
        for (const entry of getCredentials) {
          if (Array.isArray(entry) && entry.length >= 2) {
            url.searchParams.append(entry[0], entry[1])
          }
        }
      }
    } else if (typeof getCredentials === 'object') {
      // { key1: "value1", key2: "value2" }
      for (const [key, value] of Object.entries(getCredentials)) {
        url.searchParams.append(key, value)
      }
    }
    formattedRemote = url.toString()
  }
  
  const downloadFile = (url, dest, timeout) => {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest)
      const protocol = url.startsWith('https') ? https : http

      const parsedUrl = new URL(url)
      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        headers: {},
      }

      if (authHeader) {
        requestOptions.headers.Authorization = authHeader
      }

      if (basicCredentials) {
        requestOptions.headers.Authorization = `Basic ${Buffer.from(basicCredentials).toString('base64')}`
      }

      const request = protocol.get(requestOptions, (response) => {
        if (response.statusCode !== 200) {
          file.close(() => fs.unlink(dest, () => {}))
          response.resume()
          reject(new Error(`Download failed with status code: ${response.statusCode}`))
          return
        }

        response.pipe(file)
        file.on('finish', () => {
          file.close((err) => {
            if (err) reject(err)
            else resolve()
          })
        })
      }).on('error', (downloadErr) => {
        file.close(() => fs.unlink(dest, () => reject(downloadErr)))
      })

      file.on('error', (fileErr) => {
        request.destroy()
        file.close(() => fs.unlink(dest, () => reject(fileErr)))
      })

      if (timeout) {
        request.setTimeout(timeout * 1000, () => {
          request.destroy()
          reject(new Error(`Download timed out after ${timeout} seconds`))
        })
      }
    })
  }
  
  
  const zipPath = path.join(installDirectory, 'download.zip')
  
  
  // Ensure the directory exists
  fs.mkdirSync(installDirectory, { recursive: true })
  
  
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
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
  
  
  if (postInstall) {
    let commands
    if (typeof postInstall === 'object' && !Array.isArray(postInstall)) {
      // Platform-specific: { win32: "cmd", linux: ["cmd1", "cmd2"], ... }
      const platformCmds = postInstall[process.platform]
      if (!platformCmds) {
        console.log(`No postInstall commands for platform: ${process.platform}`)
      }
      commands = platformCmds ? (Array.isArray(platformCmds) ? platformCmds : [platformCmds]) : []
    } else {
      commands = Array.isArray(postInstall) ? postInstall : [postInstall]
    }
    
    for (const command of commands) {
      console.log(`Execution>> ${command}`)
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
  }
}


if (runCommand) {
  console.log(`Running application.`)

  const child = spawn(runCommand, [], { cwd: installDirectory, shell: true, stdio: 'pipe' })

  child.stdout.pipe(process.stdout)
  child.stderr.pipe(process.stderr)

  child.on('error', (err) => {
    console.error(`Failed to execute command: ${runCommand}, error: ${err.message}`)
    process.exit(1)
  })

  child.on('close', (code) => {
    if (code !== 0) {
      process.exit(code || 1)
    }
  })
}