'use strict';
let requestPromise = require ('request-promise');
const MongoClient = require('mongodb').MongoClient;
let crypto = require('crypto');
let ErrorHandler = require('../utils/ErrorHandler')
/**
 *  get the list of friends of a given user

 * @param userId
 * @param fbAccessToken
 */
let getFBFriends = (userId, fbAccessToken)=>{

    return new Promise((resolve, reject)=>{

        let options = {
            method: 'get',
            uri: process.env.FB_GRAPH_API +  +userId +"/" + "friends?" + "access_token="+ fbAccessToken,
            headers: {
                'User-Agent': 'Request-Promise',
            },
            json: true // Automatically parses the JSON string in the response
        };

        requestPromise(options)
            .then(function (result) {
                console.log("user's friends list received");
                console.log(result);
                 resolve(result);
            })
            .catch(function (err) {

                console.log("error getting user's friends list" +  err);
                reject(err);
            });
    });
}

/**
 * generate the app secret proof for secured calls to fb api
 * @param accessToken
 * @param appSecret
 */
let generateAppSecretProof = (accessToken, appSecret)=>{

        // create the proof from the app secret and token
        var hmac = crypto.createHmac('sha256', appSecret);
        hmac.update(accessToken);

        return hmac.digest('hex');
}

/**
 * find mutual friends for the user with the access token and the user with the user id (both must be using the app)
 * @param targetUserId
 * @param sessionUserAccessToken
 * @returns {an array of mutual friends }
 */
let getMutualFriends = (targetUserId, sessionUserAccessToken)=>{


    // create the appsecret_proof for a secured call to fb api
    let proof = generateAppSecretProof(sessionUserAccessToken,process.env.FB_APP_SECRET);


    return new Promise((resolve, reject)=>{

        let options = {
            method: 'get',

            uri: process.env.FB_GRAPH_API +  +targetUserId + "?fields=context.fields(all_mutual_friends.limit(100))&access_token=" + sessionUserAccessToken + "&appsecret_proof=" + proof,
            headers: {
                'User-Agent': 'Request-Promise',
            },
            json: true // Automatically parses the JSON string in the response
        };

        requestPromise(options)
            .then(function (result) {
                console.log("mutual friends list received");
                console.log(JSON.stringify(result));
                if (result.context.all_mutual_friends){
                    resolve(result.context.all_mutual_friends.data);
                }
                else {
                      console.log("mutual friends list was empty ");
                      // use an empty array as the mutual friends list
                    resolve([]);
                }
            })
            .catch(function (err) {

                console.log("error getting mutual friends list" +  err);
                reject(err);
            });
    });
}


/**
 * get potential matches from db according to user pref
 * @param userId
 * @returns {Promise<any>}
 */
let findPotentialMatchesForUser = (userId) => {

    return new Promise((resolve, reject) => {

        // get preferences of user
        // options for user service call
        let options = {
            method: 'get',
            uri: process.env.USER_SERVICE_URL + "/" + userId + "/preferences",
            headers: {
                'User-Agent': 'Request-Promise'
            },
            json: true // Automatically parses the JSON string in the response
        };

        requestPromise(options)
            .then(function (preferences) {
                console.log("success getting user preferences");
                console.log(preferences);

                 return getBasicMatchByPref(buildPrefIndex(preferences));
            })
            .then((users) => {
                console.log("found match for user " + userId + ": " + JSON.stringify(users) );
                resolve(users);

            })
            .catch(function (err) {
                console.log("error getting users by preferences " + err);
                reject(err);
            });
    });
}

let buildPrefIndex = (preferences)=>{

    // build an index using preferences
    let index = {};

    // look for the symmetrical operation
    index['preferences.operation'] = preferences.operation == "buy" ? "sell" : "buy";
    index['preferences.currency'] = preferences.currency;
    // index['preferences.amount'] = preferences.amount;

    return index;
}
/**
 * get match from db according to preferences
 * @param preferences
 * @returns {Promise<any>}
 */
let getBasicMatchByPref = (preferences)=>{

    return new Promise((resolve, reject)=>{

        // users db
        const url = process.env.DB_URL;

        // Database Name
        const dbName = process.env.DB_NAME;

        MongoClient.connect(url, function(err, client) {

            if (err){
                reject(err);
            }

            console.log("Connected to db");

            const db = client.db(dbName);
            const collection = db.collection(process.env.USERS_COLLECTION);

            // get all users that match the preferences index
            collection.find(preferences).toArray((err,items)=>{
                if (err){
                    reject(err);
                }
                else{
                    console.log("matched items " + items);
                    resolve(items);
                }
            });
        });
    });
}


/**
 * hide personal info according to the privacy preference of the requesting user, and its connection status with each user
 */
let filterPersonalInfoVisibility=()=> {



}



module.exports.updateConnectionStatus = (req, res) =>{
    // db url
    const url = process.env.DB_URL;

    // Database Name
    const dbName = process.env.DB_NAME;


    MongoClient.connect(url, function(err, client) {
        if (err){

            let error = ErrorHandler.createError(err, "matchService", ErrorHandler.noDBConnection, "error updating connection status - error connecting to db");

            res.status(500).send(error);
        }
        console.log("Connected to db");

        const db = client.db(dbName);
        const collection = db.collection(process.env.USER_CONNECTION_COLLECTION);
        let id = req.swagger.params.fb_user_id.value;
        let targetId =  req.swagger.params.fb_target_id.value;
        let status = req.swagger.params.connectionStatus.value.status;

        collection.updateOne({
            "requestUser":id, "targetUser": targetId
        }, {
            $set: {"status":status}
        }, (err, result)=>{

            if (err){
                let error = ErrorHandler.createError(err, "matchService", ErrorHandler.noCollectionUpdate, "error updating connection status - db error while updating collection");

                res.status(500).send(err);
            }
            else{

                if (result.matchedCount == 0){

                    let error = ErrorHandler.createError("", "matchService", ErrorHandler.noConnectionFound, "error updating connection status - connection not found");

                    // no user document was found - error
                    res.status(500).send(error);
                }
                else{
                    res.status(200).send("connection status updated: " + status);
                }
            }
        });
    });
}


/**
 * create a connection request from / to a specific use
 * @param req
 * @param res
 */
module.exports.connectWithUser = function (req, res){

    // get source id from request
    const sourceId = req.swagger.params.fb_user_id.value;

    // get target id from request
    const targetId = req.swagger.params.fb_target_id.value;

    // send request to db to create a connection between the user and the target user

    // users db
    const url = process.env.DB_URL;

    // Database Name
    const dbName = process.env.DB_NAME;

    MongoClient.connect(url, function(err, client) {

        if (err){

            let error = ErrorHandler.createError(err, "matchService", ErrorHandler.noDBConnection, "error creating connection - error connecting to db");

            res.status(500).send(error);
        }

        console.log("Connected to db");

        const db = client.db(dbName);
        const collection = db.collection(process.env.USER_CONNECTION_COLLECTION);

        // createa a new pending requst between the two usres
        const connection = {
            "requestUser": sourceId,
            "targetUser": targetId,
            "status": "pending"
        };

        collection.insertOne(connection, ((err, result)=>{
            if (err){

                console.log("error creating connection  - db error while updating collection")
                let error = ErrorHandler.createError(err, "matchService", ErrorHandler.noCollectionUpdate, "error creating connection  - db error while updating collection");

                res.status(500).send(error);
            }
            else{
                res.status(200).send("connection created successfully");
                console.log("success creating connection");
            }
        }));
    });
};





/**
 * find a match for a given user.
 * get basic match from db. filter it, if needed, to include only 1st and 2nd degree friends
 * @param req
 * @param res
 */
module.exports.findMatchForUser = function findMatchForUser (req, res) {

    // get fb id and token from request
    const id = req.swagger.params.fb_user_id.value;
    const token  = req.swagger.params.fbToken.value;

    // get fb friends and basic match from db
    Promise.all([findPotentialMatchesForUser(id),getFBFriends(id, token)]).then((results)=>{

        let potentialMatches = results[0];

        // create an array of friends ids
        let arrOfFriendsIds = results[1].data.map((elem)=>{
            return(elem.id);
        });

        // create an array of mutual friends promises
        let mutualFriendsCalls = [];

        // run on the potential matches array, and find the mutual friends for each one
        potentialMatches.forEach((elem)=>{
            if (elem._id !="10159941643255344" && elem._id != "10155136573832470" && elem._id != id){
                // push a promise into the array. filter out the current session user, and real users - this is temporary until we
                // get the approval from FB
                mutualFriendsCalls.push(getMutualFriends(elem._id,token));
            }
            else{
                // add a fake promise resolving an empty object
                mutualFriendsCalls.push(new Promise((resolve, reject)=>{
                    resolve([]);
                }));
            }
        });

        // get all mutual friends arrays
        Promise.all(mutualFriendsCalls).then((results)=>{

            console.log("mutual friend array: " + JSON.stringify(results));
            // filter the results of the basic match to contain only elements in the friends array or with more than 0 mutual friends

            // for each element - add the friends degree and data about the mutual friends
            let filteredArr = potentialMatches.map((element, index)=>{
                let elem;

                // add mutual friends data
                if (results[index].length > 0){
                    // add data about mutual friends
                    elem = Object.assign({}, element, {
                        commonFriends: results[index],
                    });
                }
                if (arrOfFriendsIds.includes(element._id)){
                    // first degree
                    elem = Object.assign({}, elem, {
                        friendDegree: 1
                    });
                }
                else if (results[index].length > 0){
                    // 2nd degree
                    elem = Object.assign({}, elem, {
                        friendDegree: 2
                    });
                }
                else{
                    elem = element;
                }

                return elem;
            }).filter((element, index, array)=>{

                    // return only first or second degree friends
                    return element.friendDegree;
                });

            console.log(filteredArr);
            res.status(200).send(filteredArr);
        }).catch((err)=>{
            console.log("error while getting mutual friends " + err);
            res.status(500).send(err);

        });

    }).catch((err)=>{
        console.log("error finding match for user " + err);

        res.status(500).send(err);
    });
};



