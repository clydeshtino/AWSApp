// for db wrapper lambda
import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyResult } from 'aws-lambda';
const dynamoDb = new DynamoDB.DocumentClient();

const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE || '';

interface Message {
  id: string;
  title: string;
  message: string;
  timestamp: string;
}

export const handler = async (event: any): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  if (event.eventType === 'create-post') {
    const message: Message = JSON.parse(event.body);
    if (!message.id || !message.title || !message.message || !message.timestamp) {
      console.error('Invalid message structure:', JSON.stringify(message, null, 2));
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent',
        },
        body: JSON.stringify({ message: 'Invalid message structure'}),
      };
    }
    const result = await handleCreatePost(message);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent',
      },
      body: JSON.stringify({ message: `Post with id ${message.id} created successfully: ${JSON.stringify(result)}`}),
    };
  } else if (event.eventType === 'get-posts') {
    return await handleGetPosts(event);
  } else {
    console.error('Invalid event type:', event.eventType);
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent',
      },
      body: JSON.stringify({ message:'Invalid event type'}),
    };
  }
};

async function handleCreatePost(message: Message) {
  const params: DynamoDB.DocumentClient.PutItemInput = {
    TableName: process.env.DYNAMODB_TABLE || '',
    Item: {
      id: message.id,
      title: message.title,
      message: message.message,
      timestamp: message.timestamp,
    },
    ConditionExpression: 'attribute_not_exists(id)',
  };
  try {
    const result = await dynamoDb.put(params).promise();
    console.log(`Successfully added message: ${JSON.stringify(message)} with message ID: ${message.id}`); 
    console.log('Put result:', JSON.stringify(result));
    return result;
  } catch (error: any) {
    if (error.code === 'ConditionalCheckFailedException') {
      console.warn(`Message with ID ${message.id} already exists`);
      return {
        statusCode: 409,
        body: JSON.stringify(`Message with ID ${message.id} already exists`),
      };
    } else {
      console.error('Error adding message:', error);
      throw error;
    }
  }
}
async function handleGetPosts(event: any) {
  try {
    const params = {
      TableName: DYNAMODB_TABLE,
    };
    const data = await dynamoDb.scan(params).promise();
    const posts = data.Items || [];
    console.log('Retrieved posts:', JSON.stringify(posts, null, 2));
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent',
      },
      body: JSON.stringify({ posts }),
    };
  } catch (error: any) {
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
    }
  }
}