'use strict';



/**
 * create a new user in the db
 * @param req
 * @param res
 */
module.exports.findMatchForUser = function findMatchForUser (req, res) {


    // // get id from request
    // const fbUserID = req.swagger.params.fb_user_id.value;
    //
    // let record = createUserData(fbUserID,userName, email);
    //
    // // db url
    // const url = process.env.DB_URL;
    //
    // // Database Name
    // const dbName = process.env.DB_NAME;
    //
    //
    // // connect to the server
    // MongoClient.connect(url, function(err, client) {
    //     assert.equal(null, err);
    //     console.log("Connected to db");
    //
    //     const db = client.db(dbName);
    //
    //     insertUserToDB(db, function(err,result) {
    //
    //
    //         if (err){
    //             res.status(500).send(err);
    //         }
    //         else{
    //             console.log("document inserted");
    //             console.log(result.ops);
    //             client.close();
    //             res.send(200);
    //         }
    //
    //     }, record);
    // });

    res.send("ok");
};



