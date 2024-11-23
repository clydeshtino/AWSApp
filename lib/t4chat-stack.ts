import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam'
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class Team4ProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props ? : cdk.StackProps) {
    super(scope, id, props);

    /* 
     * chat service
     */

    const chatServiceLambdaFunction = new NodejsFunction(this, 'service-lambda', {
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
    });

    // Define ChatServiceApi API Gateway resource
    const chatServiceApi = new apigateway.LambdaRestApi(this, 'ChatServiceApi', {
      handler: chatServiceLambdaFunction,
      proxy: false,
    });

    // Define the '/message' resource on ChatService API
    const chatServiceApiPostResource = chatServiceApi.root.addResource('message');
    chatServiceApiPostResource.addMethod('GET');
    chatServiceApiPostResource.addMethod('POST');

    /* 
     * sqs queue
     */

    const chatMessageDeadLetterQueue: sqs.DeadLetterQueue = {
      maxReceiveCount: 20,
      queue: new sqs.Queue(this, 'ChatMessageDeadLetterQueue'),
    };

    // Define Team4ChatMessageQueue SQS resource
    const chatMessageQueue = new sqs.Queue(this, 'ChatMessageQueue', {
      deadLetterQueue: chatMessageDeadLetterQueue,
      queueName: 'Team4ChatMessageQueue',
      retentionPeriod: cdk.Duration.seconds(600),
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    /* 
     * pull worker lambda
     */

    // Define ChatServiceLambda Lambda function resource
    const chatPullWorkerLambdaFunction = new NodejsFunction(this, 'pullworker-lambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      events: [new eventsources.SqsEventSource(chatMessageQueue, {
        batchSize: 1
      })],
      handler: 'handler',
      role: new iam.Role(this, 'ChatMessageQueueExecutionRole', {
        roleName: 'ChatMessageQueueExecutionRole',
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaSQSQueueExecutionRole"),
        ]
      }),
    });
  }
}
