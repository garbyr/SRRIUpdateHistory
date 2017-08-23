// dependencies
const aws = require('aws-sdk');
aws.config.update({ region: 'eu-west-1' });
//globals
var error = false;
var errorMessage = [];
var functionName = "";


exports.handler = (event, context, callback) => {
    //parse the event from SNS
    console.log(event);
    var dateSequence = new Date().getTime().toString();
    var dateTime = new Date().toUTCString();
    functionName=context.functionName;
    //execute the main process
    console.log("INFO: begin processing");
    //async call to get last sequence and callback to main
    dynamoDBCurrent(context, event, callback, dateSequence, dateTime);
}

dynamoDBCurrent = function(context, input, callback, dateSequence, dateTime){
    var dynamo = new aws.DynamoDB();
    var tableName = "SRRICurrent";
    var item = {
        RequestUUID: { "S": input.requestUUID },
        ISIN: { "S": input.ISIN },
        Volatility: {"S" : input.volatility},
        RiskScore: {"S": input.riskScore},
        Category: {"S": input.category},
        Frequency: { "S": input.frequency },
        UpdatedTimeStamp: { "N": dateSequence },
        UpdatedDateTime: { "S": dateTime },
        UpdateUser: { "S": input.user },
        Sequence: { "S": input.sequence }
    }
    var params = {
        TableName: tableName,
        Item: item
    }
    console.log("INFO: writing SRRI Current record ", item);
    dynamo.putItem(params, function (err, data) {
        if (err) {
            console.log("ERROR: writing SRRI Current record", err);
            error = true;
            errorMessage.push("SRRI Current not updated; error writing record to database");
            raiseError((input.ISIN, input.sequence, input.requestUUID,input.user, callback));
        }
        else {
            dynamoDBHistory(item, callback);
        }
    });
}


dynamoDBHistory = function(item, callback){
    var dynamo = new aws.DynamoDB();
    var tableName = "SRRIHistory";
    var params = {
        TableName: tableName,
        Item: item
    }
    console.log("INFO: writing SRRI History record ", item);
    dynamo.putItem(params, function (err, data) {
        if (err) {
            console.log("ERROR: writing SRRI History record", err);
            error = true;
            errorMessage.push("SRRI History not updated; error writing record to database");
            raiseError((input.ISIN, input.sequence, input.requestUUID,input.user, callback));
        }
        else {
            dynamoDBAudit(item, callback);        
        }
    });
}

dynamoDBAudit = function(itemX, callback){
    var dynamo = new aws.DynamoDB();
    var tableName = "SRRIAudit";
    var item ={
       RequestUUID: { "S": itemX.requestUUID },
        ISIN: { "S": itemX.ISIN },
        Volatility: {"S" : itemX.volatility},
        RiskScore: {"S": itemX.riskScore},
        Category: {"S": itemX.category},
        Frequency: { "S": itemX.frequency },
        CreatedTimeStamp: { "N": itemX.dateSequence },
        CreatedDateTime: { "S": itemX.dateTime },
        UpdateUser: { "S": itemX.user },
        Sequence: { "S": itemX.sequence } 
    }

    var params = {
        TableName: tableName,
        Item: item
    }
    console.log("INFO: writing SRRI Audit record ", item);
    dynamo.putItem(params, function (err, data) {
        if (err) {
            console.log("ERROR: writing SRRI Audit record", err);
            error = true;
            errorMessage.push("SRRI Audit not updated; error writing record to database");
            raiseError((input.ISIN, input.sequence, input.requestUUID,input.user, callback));
        }
        else {
            console.log("SUCCESS: writing SRRI Audit record", data);
                        
                var response = {
                    requestUUID: input.requestUUID,
                    ISIN: input.ISIN,
                    NAV: input.NAV,
                    sequence: newSequence,
                    frequency: input.frequency,
                    category: input.category,
                    user: input.user,
                    ISINDescription: input.ISINDescription
                }
                var output={
                    status: "200",
                    response: response
                }
                callback(null, {response});          
        }
    });
}

raiseError = function (ISIN, sequence, requestUUID, user, callback) {
    //write to the database
     var errorObj = {
        requestUUID: requestUUID,
        ISIN:ISIN,
        sequence: sequence,
        user: user,
        function: functionName,
        messages: errorMessage,

    }
    //reset error details just in case container is reused!!
    error = false;
    errorMessage = [];
    callback(errorObj);
}



