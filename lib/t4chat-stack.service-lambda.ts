import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const sqs = new AWS.SQS();
const lambda = new AWS.Lambda();

const CHAT_MESSAGE_QUEUE_URL = process.env.CHAT_MESSAGE_QUEUE_URL || '';
const WRAPPER_LAMBDA_NAME = process.env.WRAPPER_LAMBDA_NAME || '';

export const handler: APIGatewayProxyHandler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    const httpMethod = event.httpMethod;
    const path = event.path;
    console.log(`event: ${JSON.stringify(event)}`);
    console.log(`event: ${event}`);
    console.log(`httpMethod: ${httpMethod}, path: ${path}`);

    try {
        if (httpMethod === 'POST') {
            return await handleCreatePost(event);
        } else if (httpMethod === 'GET') {
            return await InvokeDBWrapper(event);
        } else {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent',
                },
                body: JSON.stringify({ message: 'Not Found' }),
            };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent',
            },
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};

const handleCreatePost = async (event: any) => {
    try {
        const body = event.body ? JSON.parse(event.body) : {};
        const { title, message } = body;

        if (!title || !message) {
            console.log('Missing required fields: title or message');
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent',
                },
                body: JSON.stringify({ message: 'Missing required fields: title, message' }),
            };
        }

        const postId = uuidv4();
        console.log(`Generated postId: ${postId}`);

        const post = {
            id: postId,
            title,
            message,
            timestamp: new Date().toISOString(),
        };

        console.log('Post object to send to SQS:', JSON.stringify(post));

        const params = {
            QueueUrl: CHAT_MESSAGE_QUEUE_URL,
            MessageBody: JSON.stringify(post),
        };

        await sqs.sendMessage(params).promise();
        console.log(`Message sent to SQS: ${JSON.stringify(post)}`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent',
            },
            body: JSON.stringify({ message: 'Post queued successfully', postId: post.id }),
        };
    } catch (error) {
        console.error('Error creating post:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent',
            },
            body: JSON.stringify({ message: 'Failed to create post' }),
        };
    }
};

const InvokeDBWrapper = async (event: any) => {
    try {
        const payload = {
            eventType: 'get-posts',
            event: event,
        };
        const params = {
            FunctionName: WRAPPER_LAMBDA_NAME, 
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify(payload),
        };
        const result = await lambda.invoke(params).promise();
        console.log(`Invoked lambda ${process.env.WRAPPER_LAMBDA_NAME!} with result ${JSON.stringify(result)}`);
        const responsePayload = JSON.parse(result.Payload as string);
        console.log(`Response payload: ${JSON.stringify(responsePayload)}`);
        let headers = responsePayload.headers;
        if (typeof headers === 'string') {
            headers = JSON.parse(headers);
        }
        headers = {
            ...headers,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent',
        }
        let body = responsePayload.body;
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }
        return {
            statusCode: responsePayload.statusCode,
            headers: headers,
            body: JSON.stringify(body),
        };
    } catch (error) {
        console.error('Error retrieving posts:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent',
            },
            body: JSON.stringify({ message: 'Failed to retrieve posts' }),
        };
    }
};