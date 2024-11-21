import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { DynamoDbDataSource } from 'aws-cdk-lib/aws-appsync';

export class Team4ProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props ? : cdk.StackProps) {
    super(scope, id, props);

    // example resource
    // const queue = new sqs.Queue(this, 'Team4ProjectQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    // Define the Lambda function resource
    const messagesTable = new dynamodb.Table(this, 'MessagesTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // typical free-tier billing mode, will not actually bill us as long as free tier is not exceeded but required to be set to avoid a worse default
      removalPolicy: cdk.RemovalPolicy.RETAIN, // retain the table when the stack is deleted(idk if this should be destroy or not)
    });

    const chatServiceLambdaFunction = new lambda.Function(this, 'ChatServiceLambdaFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('ChatServiceLambda'),
      handler: 'main.handler',
    });

    const dbWrapperLambdaFunction = new lambda.Function(this, 'DbWrapperLambdaFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/dbWrapper'),
      environment: {
        DYNAMODB_TABLE: messagesTable.tableName,
      },
    });

    messagesTable.grantReadWriteData(dbWrapperLambdaFunction);

    // Define the API Gateway resource
    const api = new apigateway.LambdaRestApi(this, 'ChatServiceApi', {
      handler: chatServiceLambdaFunction,
      proxy: false,
    });

    // Define the '/post' resource
    const postResource = api.root.addResource('post');
    postResource.addMethod('GET');
    postResource.addMethod('POST');
  }
}
