'use strict';
let requestPromise = require ('request-promise');


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
                'User-Agent': 'Request-Promise'
            },
            json: true // Automatically parses the JSON string in the response
        };

        requestPromise(options)
            .then(function (result) {
                console.log("user's friends list recieved");

                 resolve(result);
            })
            .catch(function (err) {

                console.log("error getting user's friends list" +  err);
                reject(err);
            });
    });







}

/**
 * find a match for a given user.
 * @param req
 * @param res
 */
module.exports.findMatchForUser = function findMatchForUser (req, res) {


    getFBFriends(req.swagger.params.fb_user_id.value, req.swagger.params.fbToken.value).then((result)=>{

        res.status(200).send(result);

    }).catch((error)=>{
        res.status(500).send(error);
    });
};



