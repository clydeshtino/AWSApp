import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam'
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as path from "path";
import { CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { DynamoDbDataSource } from 'aws-cdk-lib/aws-appsync';
import { Bucket, BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Distribution, OriginAccessIdentity } from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";

export class Team4ProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props ? : cdk.StackProps) {
    super(scope, id, props);

    /*
     * front end s3 bucket
     */
    // Content bucket
    const siteBucket = new s3.Bucket(this, 'team4sitebucket', {
      bucketName: 'team4sitebucket',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Grant access to cloudfront
    const cloudfrontOAI = new cloudfront.OriginAccessIdentity(this, 'cloudfront-OAI', {
      comment: `OAI for ${id}`
    });

    siteBucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [siteBucket.arnForObjects('*')],
      principals: [new iam.CanonicalUserPrincipal(cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId)]
    }));
    new CfnOutput(this, 'Bucket', { value: siteBucket.bucketName });
    new CfnOutput(this, 'S3Bucket', { value: siteBucket.bucketName });

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      defaultRootObject: "index.html",
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      errorResponses: [{
        httpStatus: 403,
        responseHttpStatus: 403,
        responsePagePath: '/error.html',
        ttl: Duration.minutes(30),
      }],
      defaultBehavior: {
        origin: new cloudfront_origins.S3Origin(siteBucket, { originAccessIdentity: cloudfrontOAI }),
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      }
    })

    new CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
    new CfnOutput(this, 'CloudFrontDistribution', { value: distribution.distributionDomainName})

    // Deploy site contents to S3 bucket
    new s3deploy.BucketDeployment(this, 'DeployWithInvalidation', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../site-contents'))],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    /*
     * database
     */
    const messagesTable = new dynamodb.Table(this, 'MessagesTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // typical free-tier billing mode, will not actually bill us as long as free tier is not exceeded but required to be set to avoid a worse default
      removalPolicy: cdk.RemovalPolicy.DESTROY, // retain the table when the stack is deleted(idk if this should be destroy or not)
    });

    /*
     * db wrapper lambda
     */
    // Define the dbWrapperLambdaFunction Lambda resource
    const dbWrapperLambdaFunction = new lambda.Function(this, 'DbWrapperLambdaFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/dbWrapper'),
      environment: {
        DYNAMODB_TABLE: messagesTable.tableName,
      },
    });
    messagesTable.grantReadWriteData(dbWrapperLambdaFunction);

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

      chatMessageQueue.grantSendMessages(dbWrapperLambdaFunction);

       /*
     * chat service
     */
      const chatServiceLambdaFunction = new NodejsFunction(this, 'service-lambda', {
        handler: 'handler',
        runtime: lambda.Runtime.NODEJS_20_X,
        environment: {
          CHAT_MESSAGE_QUEUE_URL: chatMessageQueue.queueUrl,
          DYNAMODB_TABLE: messagesTable.tableName,
        }
      });

       // Define ChatServiceApi API Gateway resource
      const chatServiceApi = new apigateway.LambdaRestApi(this, 'ChatServiceApi', {
        handler: chatServiceLambdaFunction,
        proxy: false,
        defaultCorsPreflightOptions: {
          allowOrigins: ['https://d2h8kqlsohfm1u.cloudfront.net'],
          allowMethods: ['GET', 'POST'],
      }});
        
      // Define the '/message' resource on ChatService API
      const chatServiceApiPostResource = chatServiceApi.root.addResource('message');
      chatServiceApiPostResource.addMethod('GET');
      chatServiceApiPostResource.addMethod('POST');
      new CfnOutput(this, 'APIEndpoint', { value: chatServiceApi.url });

    /*
     * pull worker lambda
     */
    // Define pull worker lambda function resource
    const chatPullWorkerLambdaFunction = new NodejsFunction(this, 'pullworker-lambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: 'lib/t4chat-stack.pullworker-lambda.ts',
      events: [new eventsources.SqsEventSource(chatMessageQueue, {
        batchSize: 1
      })],
      handler: 'handler',
      environment: {
        WRAPPER_LAMBDA_NAME: dbWrapperLambdaFunction.functionName,
      },
      role: new iam.Role(this, 'ChatMessageQueueExecutionRole', {
        roleName: 'ChatMessageQueueExecutionRole',
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaSQSQueueExecutionRole"),
          iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
        ]
      }),
    });
    dbWrapperLambdaFunction.grantInvoke(chatPullWorkerLambdaFunction);
    chatMessageQueue.grantConsumeMessages(chatPullWorkerLambdaFunction);
  }
}
