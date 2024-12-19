# Aquarion
Remote app deployment system


## Overview

Allows deployment of a nodejs app to any system that has nodejs installed.




## Usage

Given that nodejs is installed on the system:

You provide a `config.json` with necessary info.
- can contain credentials
- can be auto-generated

`npx aquarion my-config.json`


## Workings

* Reads a URL and credentials from the config file.
* Downloads the remote package (if necessary), unzips if necessary.
* Installs packages.


## Config

```
{
  remote: "https://some.server.com",
  authHeader: "Authorize somesuchanwhathaveyou",
  getCredentials: "api_key=1234",
  basicCredentials: "user:password",
  directory: "./test/app",
  preInstall: "npm install",
  postInstall: "npm run build",
  installedCommand: "best-app-ever",
}
```
