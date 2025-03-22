# Aquarion Test Server


The basic idea here is that the server provides a JSON file with info for the client to get the app.

There are two methods available: HTTP Basic auth and API key.


The `/get/*` routes generate the config.json file for the client.

The client then runs `npx aquarion config.json` to get install the app.


In production your web-app would do the validation of the user and provide some key which was then wiped after installing the app (or some time elapsed (or whatever.))
