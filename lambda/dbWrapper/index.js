// for db wrapper lambda
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    const message = event;
    if (!message.id || !message.title || !message.message || !message.timestamp) {
        console.error('Invalid message structure:', JSON.stringify(message, null, 2));
        return {
            statusCode: 400,
            body: JSON.stringify('Invalid message structure'),
        };
    }

    const params = {
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
            id: message.id,
            title: message.title,
            message: message.message,
            timestamp: message.timestamp,
        },
        ConditionExpression: 'attribute_not_exists(id)', // check idempotency
    };

    try {
        await dynamoDb.put(params).promise();
        console.log(`Successfully added message with id: ${message.id}`);
    } catch (error) {
        if (error.code === 'ConditionalCheckFailedException') {
            console.warn(`Message with id: ${message.id} already exists`);
        } else {
            console.error(`Error adding message with id: ${message.id}. ${error}`);
            throw error;
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify('Success'),
    };
};