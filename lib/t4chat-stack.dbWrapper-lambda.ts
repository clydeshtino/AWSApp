// for db wrapper lambda
import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyResult } from 'aws-lambda';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
const dynamoDb = new DynamoDB.DocumentClient();

interface Message {
  id: string;
  title: string;
  message: string;
  timestamp: string;
}

export const handler = async (event: any): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const message: Message = event;
  
  if (!message.id || !message.title || !message.message || !message.timestamp) {
    console.error('Invalid message structure:', JSON.stringify(message, null, 2));
    return {
      statusCode: 400,
      body: JSON.stringify('Invalid message structure'),
    };
  }
  console.log(`${process.env.DYNAMODB_TABLE}`);
  const params: DynamoDB.DocumentClient.PutItemInput = {
    TableName: process.env.DYNAMODB_TABLE || '',
    Item: {
      id: message.id,
      title: message.title,
      message: message.message,
      timestamp: message.timestamp,
    },
    ConditionExpression: 'attribute_not_exists(id)', // idempotency check
  };
  try {
    const result = await dynamoDb.put(params).promise();
    console.log(`Successfully added message with id: ${message.id}`);
    console.log(`Result: ${JSON.stringify(result)}`);
  } catch (error: any) {
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