  const promptElevatePermissions = () => {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })

      rl.question('This operation requires elevated permissions. Do you want to proceed? (yes/no): ', (answer) => {
        rl.close()
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          resolve(true)
        } else {
          resolve(false)
        }
      })
    })
  }

  const elevateOnWindows = (command) => {
    return new Promise((resolve, reject) => {
      sudoPrompt.exec(command, { name: 'Aquarion Installer' }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Failed to elevate permissions: ${error.message}`))
        } else {
          console.log(stdout)
          if (stderr) console.error(stderr)
          resolve()
        }
      })
    })
  }


if (installedCommand) {
  console.log(`Setting up global command: aqua-${installedCommand}`)
  const linkCommand = process.platform === 'win32'
    ? `mklink "${path.join(process.env.APPDATA, 'npm', `aqua-${installedCommand}.cmd`)}" "${path.join(installDirectory, installedCommand)}"`
    : `ln -s "${path.join(installDirectory, installedCommand)}" "/usr/local/bin/aqua-${installedCommand}"`

  try {
    execSync(linkCommand, { stdio: 'inherit' })
    console.log(`Global command aqua-${installedCommand} installed successfully.`)
  } catch (err) {
    console.error('Attempting to prompt for elevated permissions...')
    
    if (process.platform === 'win32') {
      await elevateOnWindows(linkCommand)
      console.log(`Global command aqua-${installedCommand} installed successfully with elevated permissions on Windows.`)
    } else {
      const elevate = await promptElevatePermissions()
      if (elevate) {
        try {
          execSync(`sudo ${linkCommand}`, { stdio: 'inherit' })
          console.log(`Global command aqua-${installedCommand} installed successfully with elevated permissions.`)
        } catch (sudoErr) {
          console.error(`Failed to create global command even with elevated permissions: ${sudoErr.message}`)
        }
      } else {
        console.log('Global command installation aborted by user.')
      }
    }
  }
}
