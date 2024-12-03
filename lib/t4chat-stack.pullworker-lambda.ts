import { SQSEvent, Context, SQSHandler, SQSRecord } from "aws-lambda";
import AWS = require("aws-sdk");

const lambda = new AWS.Lambda();

export const handler: SQSHandler = async (
	event: SQSEvent,
	context: Context
): Promise<void> => {
	for (const message of event.Records) {
		await processMessageAsync(message);
	}
	console.info("done");
};

async function processMessageAsync(message: SQSRecord): Promise<any> {
	try {
		console.log(`Received message ${message.body}`);
		const params = {
			FunctionName: process.env.WRAPPER_LAMBDA_NAME!,
			InvocationType: 'Event', // asynchronous invocation
			Payload: message.body, // Pass only the message body
		};
		const result = await lambda.invoke(params).promise();
		console.log(`Invoked lambda ${process.env.WRAPPER_LAMBDA_NAME!} with result ${JSON.stringify(result)}`);
	} catch (err) {
		console.error("An error occurred while invoking dbWrapperLambdaFunction:", err);
		throw err;
	}
}
