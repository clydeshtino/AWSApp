import { InvocationType } from "aws-cdk-lib/triggers";
import { SQSEvent, Context, SQSHandler, SQSRecord } from "aws-lambda";
import * as AWS from "aws-sdk";
export const handler
: SQSHandler = async (
	event: SQSEvent,
	context: Context
): Promise < void > => {
	for (const message of event.Records) {
		await processMessageAsync(message);
	}
	console.info("done");
};

const lambda = new AWS.Lambda();

async function processMessageAsync(message: SQSRecord): Promise < any > {
	try {
		console.log(`Received message ${message.body}`);
		// TODO: Do interesting work based on the new message
		// i think this will be just a post. idempotency check will be done in the wrapper lambda
		const params = {
			FunctionName: process.env.WRAPPER_LAMBDA_NAME!,
			InvocationType: 'Event', // async
			Payload: JSON.stringify(message)	
		}
		const result = await lambda.invoke(params).promise();
		console.log(`Invoked lambda ${process.env.WRAPPER_LAMBDA_NAME!} with result ${result}`);
	} catch (err) {
		console.error("An error occurred");
		throw err;
	}
}
