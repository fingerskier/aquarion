# Aquarion
Remote app deployment system


## Overview

Facilitates deployment of a nodejs app to any system that has nodejs installed.


## Caveats

A. Target system needs NodeJS installed  
2. The deployment must be a .zip file  
D. If the target directory exists then the download is skipped: i.e. the client can just run the app... unless the `update` flag is passed to the CLI command (in which case the app is downloaded again.)  


## CLI Usage

`npx aquarion <config.json> update`

You provide a `config.json` with necessary info:
  e.g. auto-generate a config file which contains necessary settings and temporary credentials.

Run this command to run normally:
`npx aquarion config.json`


Run this command to update/reinstall:
`npx aquarium config.json --update`


## Config Deets

Example `config.json`:
```
{
  remote: "https://some.server.com",
  timeout: 30,
  authHeader: "Authorize somesuchanwhathaveyou",
  getCredentials: "api_key=1234",
  basicCredentials: "user:password",
  installDirectory: "./test/app",
  postInstall: "npm run build",
  runCommand: 'node .',
}
```


### Further Thoughts

The goal of this app is to get code deployed...not build it on the fly.
So, things like `preinstall` settings or installing a `.sh` or `.cmd` or platform-specific stuff are best done by the deployed app.
i.e. just do npm-level commands via `aquarion` config.


## Config Details

`remote` ~ the URL of the remote server from which to download the app.  

`timeout` ~ number of seconds after which the download attempt is cancelled.  

`getCredentials` ~ for HTTP GET requests: this adds a query string; can be a string or a key/value array:
  * "val=1234"
  * ["key": "val"]

`authHeader` ~ adds an Authorization header to the request
  * e.g. you could auto-generate a token in this file, client runs it to install, then the token is invalidated after (which is okay because `aquarion` will run locally by default after installed.)  

`basicCredentials` ~ for HTTP Basic auth: this adds the appropriate header
  * this will override prior more general Auth header

`installDirectory` ~ whereas to put the unzipped files.  

`flush` ~ boolean to indicate whether to empty the `installDirectory` before installing from the downloaded `.zip`.  

`postInstall` ~ command(s) to run after locuting the files
  * can be a string or an array of string-commands or an object
  * if an object, the key is the <platform-name> and the value is a string or array of string-commands

`runCommand` ~ the command needed to start the app


## TODO
