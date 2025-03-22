export default async function(req, res) {
  try {
    const newKey = Math.random().toString(36).substring(2, 4) + Math.random().toString(36).substring(2, 4)
    const origin = req.query.origin
    global.keys[origin] = newKey
    
    console.log(global.keys)
    
    let config = {
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
    
    // Write config object to file and send it
    const configString = JSON.stringify(config, null, 2)
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="config.json"`)
    res.send(configString)
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    console.log('/get fin')
  }
}