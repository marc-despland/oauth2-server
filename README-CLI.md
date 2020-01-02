#CLI

Cli is a simple command line client used togenerate the content of the files that list user, roles and clients.

## Create a client

Create an appli and expose the result on output
```
node cli.js --action createappli
```

Create an appli and save the data in the clients.json file
```
node cli.js --action createappli --clientsfile clients.json
```

In both case a file <clientid>.json is created that contains the secret in clear form

## Create a user

```
node cli.js --action createuser --login Paul --password password02 --usersfile users.json
```

## Create a role
```
node cli.js --action createrole --rolesfile roles.json --rolename "Read/Write"
```

## Allow a user
```
node cli.js --action allowuser --clientid e3268d5d5d68a46b --login Marc --roles d29fc67da0ba133c,c0b54393289a1a11 --clientsfile clients.json
```
