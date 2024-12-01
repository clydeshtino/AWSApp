import { InvocationType } from "aws-cdk-lib/triggers";
import { SQSEvent, Context, SQSHandler, SQSRecord } from "aws-lambda";
import AWS = require("aws-sdk");
export const handler: SQSHandler = async (
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
