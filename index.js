'use strict';

var bodyParser = require('body-parser');
var express = require('express');
var Password = require('./lib/password.js');
const fs = require('fs');

var host = process.env.LISTEN_HOST || "0.0.0.0";
var port = process.env.LISTEN_PORT || 8080;

var oauth2 = express();
var urlencodedParser = bodyParser.urlencoded({ extended: false })

oauth2.use(bodyParser.json());
oauth2.use(bodyParser.urlencoded({ extended: false }));
oauth2.post('/oauth2/token',urlencodedParser, oauth2GetToken);
oauth2.get('/user', oauth2Authorize);


var clients={};

var roles= {}

var users={};

var access_tokens={};
var refresh_tokens={};
try {
    let rawdata = fs.readFileSync(process.env.CLIENTS || "clients.json");
    clients = JSON.parse(rawdata);
    console.log("Clients list loaded");
} catch (exceptio) {
    console.log("Failed to load clients");
}
try {
    let rawdata = fs.readFileSync(process.env.USERS || "users.json");
    users = JSON.parse(rawdata);
    console.log("USers list loaded");
} catch (exceptio) {
    console.log("Failed to load users");
}
try {
    let rawdata = fs.readFileSync(process.env.ROLES || "roles.json");
    roles = JSON.parse(rawdata);
    console.log("Roles list loaded");
} catch (exceptio) {
    console.log("Failed to load roles");
}



function checkPassword(user, password) {
    if (users.hasOwnProperty(user)) {
        return Password.checkSaltHashPassword(password, users[user].password, users[user].salt)
    } else {
        return false;
    }
}


function checkSecret(clientid, secret) {
    if (clients.hasOwnProperty(clientid)) {
        return Password.checkSaltHashPassword(secret, clients[clientid].secret, clients[clientid].salt)
    } else {
        return false;
    }
}

oauth2.listen(port, host, function () {
    console.log("Listening on " + host + ", port " + port);
});


async function createToken(clientid, username) {
    var token={
        "access_token": Password.genRandomString(32),
        "token_type":"bearer",
        "expires_in":3600,
        "refresh_token": Password.genRandomString(32),
    }
    var context= {
        clientid: clientid,
        username: username,
        creationDate: Date.now(),
        token: token
    }
    if (clients.hasOwnProperty(clientid)) {
        if (clients[clientid].allow_users.hasOwnProperty(username)) {
            clients[clientid].allow_users[username].token=token;
            access_tokens[token.access_token]=context;
            refresh_tokens[token.refresh_token]=context;
            return token;
        }
    }
    return false;
}

function sendErrorMessage(response, status, message) {
    var error = {
        message: message
    }
    response.status(status);
    response.json(error);   
} 

async function oauth2GetToken(request, response) {
    if (request.headers.hasOwnProperty("authorization") &&
            request.body.grant_type!==undefined &&
            request.body.username!==undefined &&
            request.body.password!==undefined &&
            request.body.grant_type==="password") {
        var client= await ouath2GetClientFromAuthorization(request.headers.authorization);
        if (client) {
            if (client.allow_users.hasOwnProperty(request.body.username)){
                if (checkPassword(request.body.username, request.body.password)) {
                    if (client.allow_users[request.body.username].hasOwnProperty("token")) {
                        await expireToken(client.allow_users[request.body.username].token.access_token)
                    }
                    var token = await createToken(client.id, request.body.username);
                    if (token) {
                        response.json(token);
                    } else {
                        sendErrorMessage(response, 500, "Database issue 01");
                    }
                } else {
                    sendErrorMessage(response, 403, "Invalid Credentials");
                }
            } else {
                sendErrorMessage(response, 403, "Invalid Credentials");
            }
        } else {
            sendErrorMessage(response, 403, "Invalid Authorization");
        }
    } else {
        sendErrorMessage(response, 400, "Invalid Request");
    }
}


async function ouath2GetClientFromAuthorization(authorization) {
    if (authorization.startsWith("Basic ")) {
        var token=authorization.substring("Basic ".length);
        var decoded=Buffer.from(token,'base64').toString().split(":");
        if (decoded.length===2) {
            if (clients.hasOwnProperty(decoded[0]) && (checkSecret(decoded[0], decoded[1]))) {
                return clients[decoded[0]];
            } else {
                return false;
            }
        } else {
            return false;
        }
    } else {
        return false;
    }
}


async function expireToken(token) {
    if (access_tokens.hasOwnProperty(token)) {
        var context=access_tokens[token];
        delete access_tokens[token];
        if (refresh_tokens.hasOwnProperty(context.refresh_token)) {
            delete refresh_tokens[context.refresh_token];
        }
        if (clients.hasOwnProperty(context.clientid)) {
            if (clients[context.clientid].allow_users.hasOwnProperty(context.username)) {
                if (clients[context.clientid].allow_users[context.username].hasOwnProperty("token")) {
                    delete clients[context.clientid].allow_users[context.username].token;
                }
            }
        }
    }
}


async function oauth2Authorize(request, response) {
    if (request.query.access_token!==undefined) {
        if (access_tokens.hasOwnProperty(request.query.access_token)) {
            var context=access_tokens[request.query.access_token]
            if ((context.creationDate+(context.token.expires_in*1000))>Date.now()) {
                if (clients.hasOwnProperty(context.clientid)) {
                    if ((clients[context.clientid].allow_users.hasOwnProperty(context.username)) && (users.hasOwnProperty(context.username))) {
                        var user= {
                            "organizations": [],
                            "displayName": "",
                            "roles": [ ],
                            "app_id": clients[context.clientid].appid,
                            "trusted_apps": [],
                            "isGravatarEnabled": false,
                            "image": "",
                            "email": context.username,
                            "id": context.username,
                            "authorization_decision": "",
                            "app_azf_domain": "",
                            "eidas_profile": {},
                            "attributes": {},
                            "username": context.username                
                        }
                        clients[context.clientid].allow_users[context.username].roles.forEach(roleid => {
                            if (roles.hasOwnProperty(roleid)) {
                                var role= {
                                    id: roleid,
                                    name: roles[roleid].name
                                }
                                user.roles.push(role);
                            }
                        });
                        response.json(user);
                    } else {
                        sendErrorMessage(response, 401, "Invalid token: unknown user");
                    }
                } else {
                    sendErrorMessage(response, 401, "Invalid token: unknown clientid");
                }

            } else {
                //token expire
                await expireToken(request.query.access_token);
                sendErrorMessage(response, 401, "Invalid token: unknown user");
            }
        } else {
            sendErrorMessage(response, 401, "Invalid token: unknown user");
        }

    } else {
        sendErrorMessage(response, 401, "Invalid token: access token is invalid");
    }
}