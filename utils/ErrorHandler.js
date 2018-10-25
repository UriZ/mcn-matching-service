/**
 * error handler utils. Should be a common package
 * @type {string}
 */
const NO_CONNECTION_FOUND = "NO_CONNECTION_FOUND";
const NO_DB_CONNECTION = "NO_DB_CONNECTION";
const NO_COLLECTION_UPDATE = "NO_COLLECTION_UPDATE";

class ErrorHandler {

    static get noCollectionUpdate(){
        return NO_COLLECTION_UPDATE;
    }
    static get noConnectionFound(){
        return NO_CONNECTION_FOUND;
    }
    static get noDBConnection(){
        return NO_DB_CONNECTION;
    }

    static createError(error, serviceName, errorCode, errorMessage){
        return {
            "error": error,
            "service": serviceName,
            "errorCode": errorCode,
            "errorMessage": errorMessage
        }
    }
}

module.exports = ErrorHandler;