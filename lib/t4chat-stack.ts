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

export class Team4ProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props ? : cdk.StackProps) {
    super(scope, id, props);

    /*
     * database
     */
    const messagesTable = new dynamodb.Table(this, 'MessagesTable', {
      tableName: 'MessagesTable',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // typical free-tier billing mode, will not actually bill us as long as free tier is not exceeded but required to be set to avoid a worse default
      removalPolicy: cdk.RemovalPolicy.DESTROY, // retain the table when the stack is deleted(idk if this should be destroy or not)
    });

    /*
     * sqs queue
     */
    const chatMessageQueue = new sqs.Queue(this, 'ChatMessageQueue', {
      queueName: 'Team4ChatMessageQueue',
      retentionPeriod: cdk.Duration.seconds(600),
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    /*
     * db wrapper lambda
     */
    const dbWrapperLambdaFunction = new NodejsFunction(this, 'dbWrapper-lambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      environment: {
        DYNAMODB_TABLE: messagesTable.tableName,
      },
    });
    messagesTable.grantReadWriteData(dbWrapperLambdaFunction);

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
    new CfnOutput(this, 'ChatMessaqeQueueUrl', { value: chatMessageQueue.queueUrl });

    // Define ChatServiceApi API Gateway resource
    const chatServiceApi = new apigateway.LambdaRestApi(this, 'ChatServiceApi', {
      handler: chatServiceLambdaFunction,
      proxy: true,
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['OPTIONS', 'GET', 'POST'],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Date',
          'X-Amz-Security-Token',
          'X-Amz-User-Agent',
        ],
      },
    });
    new CfnOutput(this, 'ServiceApiUrl', { value: chatServiceApi.url });
    messagesTable.grantReadWriteData(chatServiceLambdaFunction);
    chatMessageQueue.grantSendMessages(chatServiceLambdaFunction);

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
    new CfnOutput(this, 'AppDomain', { value: distribution.distributionDomainName })


    // Deploy site contents to S3 bucket
    const config = {
      serviceApiUrl: chatServiceApi.url
    }

    // bug: aws guesses the mime type of these files incorrectly :/
    // https://github.com/aws/aws-cdk/issues/11890
    new s3deploy.BucketDeployment(this, 'DeployWithInvalidation', {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, '../site-contents')),
        s3deploy.Source.jsonData('config.json', config) // :pray: https://github.com/aws/aws-cdk/pull/18659
      ],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

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
      role: new iam.Role(this, 'Team4ChatMessageQueueExecutionRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
          iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaSQSQueueExecutionRole'),
        ],
        inlinePolicies: {
          InvokeDBWrapper: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                actions: ['lambda:InvokeFunction'],
                resources: [dbWrapperLambdaFunction.functionArn],
              }),
            ],
          }),
          WriteToDynamoDB: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                actions: [
                  'dynamodb:PutItem',
                  'dynamodb:UpdateItem',
                  'dynamodb:BatchWriteItem',
                ],
                resources: [messagesTable.tableArn],
              }),
            ],
          }),
        },
      }),
    });
    dbWrapperLambdaFunction.grantInvoke(chatPullWorkerLambdaFunction);
    chatMessageQueue.grantConsumeMessages(chatPullWorkerLambdaFunction);
  }
}
