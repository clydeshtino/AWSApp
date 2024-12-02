import { APIGatewayProxyHandler } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const sqs = new AWS.SQS();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const CHAT_MESSAGE_QUEUE_URL = process.env.CHAT_MESSAGE_QUEUE_URL || '';
const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE || '';


export const handler: APIGatewayProxyHandler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    const httpMethod = event.httpMethod;
    const path = event.path;

    try {
        if (httpMethod === 'POST' && path === '/message') {
            return await handleCreatePost(event);
        } else if (httpMethod === 'GET' && path === '/message') {
            return await handleGetPosts(event);
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Not Found' }),
            };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};

const handleCreatePost = async (event: any) => {
    try {
        const body = event.body ? JSON.parse(event.body) : {};

        const { title, message } = body;

        if (!title || !message) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing required fields: title, message' }),
            };
        }

        const post = {
            id: uuidv4(), // idempotency id generator
            title,
            message,
            timestamp: new Date().toISOString(),
        };

        const params = {
            QueueUrl: CHAT_MESSAGE_QUEUE_URL,
            MessageBody: JSON.stringify(post),
        };

        await sqs.sendMessage(params).promise();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'https://d2h8kqlsohfm1u.cloudfront.net/',
            },
            body: JSON.stringify({ message: 'Post queued successfully', postId: post.id }),
        };
    } catch (error) {
        console.error('Error creating post:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to create post' }),
        };
    }
};

const handleGetPosts = async (event: any) => {
    try {
        const params = {
            TableName: DYNAMODB_TABLE,
        };

        const data = await dynamodb.scan(params).promise();

        const posts = data.Items || [];

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'https://d2h8kqlsohfm1u.cloudfront.net/',
            },
            body: JSON.stringify({ posts }),
        };
    } catch (error) {
        console.error('Error retrieving posts:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to retrieve posts' }),
        };
    }
};