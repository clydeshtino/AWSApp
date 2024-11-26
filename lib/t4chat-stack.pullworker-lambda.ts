import { SQSEvent, Context, SQSHandler, SQSRecord } from "aws-lambda";

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

async function processMessageAsync(message: SQSRecord): Promise < any > {
	try {
		console.log(`Received message ${message.body}`);
		// TODO: Do interesting work based on the new message
		// i think this will be just a post. idempotency check will be done in the wrapper lambda
		await Promise.resolve(1); //Placeholder for actual async work
	} catch (err) {
		console.error("An error occurred");
		throw err;
	}
}
