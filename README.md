# Aquarion
Remote app deployment system

## Usage

Given that nodejs is installed on the system:

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
  
}
```
