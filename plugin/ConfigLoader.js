import fs from 'fs'
import Plugin from './Plugin.js'


export default class ConfigLoader extends Plugin {
  constructor(configPath) {
    super({ configPath })
    this.configPath = configPath
  }
  
  
  execute() {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8')
      const config = JSON.parse(configData)
      this.validateConfig(config)
      return config
    } catch (err) {
      console.error(`Error loading config file: ${err.message}`)
      process.exit(1)
    }
  }
  
  
  validateConfig(config) {
    const requiredFields = ['remote', 'installDirectory', 'postInstall']
    const missingFields = requiredFields.filter((field) => !config[field])

    if (missingFields.length > 0) {
      throw new Error(`Missing required config fields: ${missingFields.join(', ')}`)
    }
  }
}
