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
 * find mutual friends for the user with the access token and the user with the user id (both must be using the app)
 * @param userId
 * @param fbAccessToken
 * @returns {an array of mutual friends }
 */
let getMutualFriends = (userId, fbAccessToken)=>{

    return new Promise((resolve, reject)=>{

        let options = {
            method: 'get',

            uri: process.env.FB_GRAPH_API +  +userId + "?fields=context.fields(all_mutual_friends.limit(100))&access_token=" + fbAccessToken,
            headers: {
                'User-Agent': 'Request-Promise',
            },
            json: true // Automatically parses the JSON string in the response
        };

        requestPromise(options)
            .then(function (result) {
                console.log("mutual friends list received");
                resolve(result.context.all_mutual_friends.data);
            })
            .catch(function (err) {

                console.log("error getting mutual friends list" +  err);
                reject(err);
            });
    });
}

/**
 * get the basic match from db - all records that match the preferences
 * @returns {Promise<any>}
 */
let basicMatch = ()=>{

    return new Promise((resolve, reject)=>{

        // options for user service call
        let options = {
            method: 'get',
            uri: process.env.USER_SERVICE_URL,
            headers: {
                'User-Agent': 'Request-Promise'
            },
            json: true // Automatically parses the JSON string in the response
        };


        requestPromise(options)
            .then(function (result) {
                console.log("success getting users from db");
                console.log(result);
                resolve(result);

            })
            .catch(function (err) {
                console.log("error getting users  from db " +  err);
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

    // get fb id and token from request
    const id = req.swagger.params.fb_user_id.value;
    const token  = req.swagger.params.fbToken.value;


    // getMutualFriends(id, token).then((result)=>{
    //     // console.log(response);
    //     console.log(result);
    //     res.send(result);
    // })

    // get fb friends and basic match from db
    Promise.all([basicMatch(),getFBFriends(id, token)]).then((results)=>{

        console.log("Array1 " + results[0]);
        console.log("Array2 " + results[1]);
        console.log("array 2 data :" + results[1].data);

        // create an array of friends ids
        let arrOfFriendsIds = results[1].data.map((elem)=>{
            return(elem.id);
        });
        console.log("array of ids " + arrOfFriendsIds);

        // fitler the results of the basic match to contain only elements in the friends array
        let filteredArr = results[0].filter((element, index, array)=>{

            console.log("checking for " + element._id);
            return arrOfFriendsIds.includes(element._id);

        });
        console.log(filteredArr);
        res.status(200).send(filteredArr);
    }).catch((err)=>{
        res.status(500).send(err);
    });


};



