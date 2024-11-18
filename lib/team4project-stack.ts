import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class Team4ProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props ? : cdk.StackProps) {
    super(scope, id, props);

    // example resource
    // const queue = new sqs.Queue(this, 'Team4ProjectQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    // Define the Lambda function resource
    const chatServiceLambdaFunction = new lambda.Function(this, 'ChatServiceLambdaFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('ChatServiceLambda'),
      handler: 'main.handler',
    });

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
