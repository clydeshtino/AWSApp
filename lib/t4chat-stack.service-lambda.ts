import { Handler } from 'aws-lambda';

export const handler: Handler = async (event, context) => {
    console.log('EVENT: \n' + JSON.stringify(event, null, 2));
    // forward idempotency id, can handle this faster on db side
    //    sqs_client.send_message_batch(
    //     QueueUrl=queue_url,
    //     Entries=message_batch,
    // )
    return context.logStreamName;
};
