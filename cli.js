'use strict';
const fs = require('fs');
var Password = require('./lib/password.js');

const argv = require('yargs')
    .usage('Usage: $0 <command> [options]')
    .option('action', {
        alias: 'a',
        describe: "Action to realize"
    })
    .option('login', {
        alias: 'l',
        describe: "The login of the user"
    })
    .option('password', {
        alias: 'p',
        describe: "The password of the user"
    })
    .option('roles', {
        alias: 's',
        describe: "Roles list comma separated"
    })
    .option('roleid', {
        describe: "Role id"
    })
    .option('rolename', {
        describe: "Role name"
    })
    .option('roledesc', {
        describe: "Role desc"
    })
    .option('clientid', {
        describe: "Client id"
    })
    .option('clientsfile', {
        describe: "Clients file"
    })
    .option('rolesfile', {
        describe: "Roles file"
    })
    .option('usersfile', {
        describe: "Users file"
    })
    .help('h')
    .alias('h', 'help')
    .epilog('copyright 2019')
    .argv;

if (argv.action !== undefined) {
    var action = argv.action;
    if (action === "createuser") {
        if (argv.login !== undefined) {
            if (argv.password !== undefined) {
                var passwordData = Password.saltHashPassword(argv.password);
                var users = {};
                if (argv.usersfile !== undefined) {
                    try {
                        let rawdata = fs.readFileSync(argv.usersfile);
                        users = JSON.parse(rawdata);
                    } catch (exceptio) {

                    }
                }
                users[argv.login] = {};
                users[argv.login].username = argv.login;
                users[argv.login].password = passwordData.passwordHash;
                users[argv.login].salt = passwordData.salt;
                if (argv.usersfile !== undefined) {
                    fs.writeFileSync(argv.usersfile, JSON.stringify(users, null, 4));
                } else {
                    console.log(JSON.stringify(users, null, 4))
                }
            } else {
                console.log("Missing password")
            }
        } else {
            console.log("Missing login")
        }
    } else if (action === "createappli") {
        var clients = {};
        if (argv.clientsfile !== undefined) {
            try {
                let rawdata = fs.readFileSync(argv.clientsfile);
                clients = JSON.parse(rawdata);
            } catch (exceptio) { }
        }
        var secret = Password.genRandomString(16);
        var secretEnc = Password.saltHashPassword(secret);
        var client = {
            id: Password.genRandomString(16),
            appid: Password.genRandomString(16),
            secret: secretEnc.passwordHash,
            salt: secretEnc.salt,
            allow_users: {}

        }
        clients[client.id] = client;
        console.log("Client Secret : " + secret);
        console.log("Client Authorize : " + Buffer.from(client.id + ":" + secret).toString('base64'))
        var secretData = {
            id: client.id,
            secret: secret,
            authorize: Buffer.from(client.id + ":" + secret).toString('base64')
        }
        fs.writeFileSync(client.id + ".json", JSON.stringify(secretData, null, 4));
        if (argv.clientsfile !== undefined) {
            fs.writeFileSync(argv.clientsfile, JSON.stringify(clients, null, 4));
        } else {
            console.log(JSON.stringify(clients, null, 4))
        }
    } else if (action === "createrole") {
        var roles = {};
        if (argv.rolesfile !== undefined) {
            try {
                let rawdata = fs.readFileSync(argv.rolesfile);
                roles = JSON.parse(rawdata);
            } catch (exceptio) { }
        }
        var role = {
            id: argv.roleid === undefined ? Password.genRandomString(16) : argv.roleid,
            name : argv.rolename === undefined ? "" : argv.rolename,
            desc : argv.roledesc === undefined ? "" : argv.roledesc
        }
        roles[role.id] = role;
        if (argv.rolesfile !== undefined) {
            fs.writeFileSync(argv.rolesfile, JSON.stringify(roles, null, 4));
        } else {
            console.log(JSON.stringify(roles, null, 4))
        }
    } else if (action === "allowuser") {
        var clients = {};
        if (argv.clientsfile !== undefined) {
            try {
                let rawdata = fs.readFileSync(argv.clientsfile);
                clients = JSON.parse(rawdata);
            } catch (exceptio) {
                console.log("Failed to read input data")
            }
            if (argv.clientid !== undefined) {
                if (clients.hasOwnProperty(argv.clientid)) {
                    if (argv.login !== undefined) {
                        if (!clients[argv.clientid].allow_users.hasOwnProperty(argv.login)) {
                            var access = {     
                                roles: []
                            }
                            if (argv.roles!==undefined) {
                                var list=argv.roles.split(",");
                                list.forEach(role => {
                                    access.roles.push(role);
                                });
                            }
                            clients[argv.clientid].allow_users[argv.login] = access;
                            fs.writeFileSync(argv.clientsfile, JSON.stringify(clients, null, 4));
                        } else {
                            console.log("User :" + argv.login + " already allow on " + argv.clientid)
                        }

                    } else {
                        console.log("Missing parameter login");
                    }
                } else {
                    console.log("Unknown clientid :" + argv.clientid)
                }
            } else {
                console.log("Missing parameter clientid");
            }

        } else {
            console.log("Missing parameter clientsfile");
        }
    } else {
        console.log("Unknown action " + action);
    }
} else {
    console.log("missing action");
}