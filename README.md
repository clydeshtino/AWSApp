# Team 4 Project: Message Board App

Team 4's app consists of a CDK (Cloud Development Kit) project written in typescript. It is a chat app where users can post whatever messages they wish. We utilized key AWS resources to create this app and ensure its functionality.

## Project Architecture
We designed our application with a public-private split using AWS resources to ensure scalability and security.

### Public Layer
- **Cloudfront**: Acts as a Content Delivery Network (CDN) and distributes the static files that our S3 Bucket hosts.
- **API Gateway**: Manages public HTTP endpoints, handling requests like:
  - `GET` to retrieve posts.
  - `POST` to create a new post.
- **Lambda #1**: Serves as the backend for the API Gateway, exposing our public endpoints.


### Private Layer
- **S3 Bucket**: Serves our static front-end page files.
- **SQS**: Acts as a message queue for asynchronous processing of `POST` requests.
- **Lambda #2**: Provides database functions for write-only.
- **Lambda #3**: Consumes messages from the SQS queue and writes data to DynamoDB.
- **DynamoDB**: Serves as the application's primary NoSQL Database.

<img src="https://github.com/clydeshtino/AWSApp/tree/main/misc" width="800" />  




## Workflow
1. **Frontend**: Sends requests to the API Gateway.
2. **Public Processing**: API Gateway triggers Lambda #1 for public endpoint logic.
3. **Private Processing**:
   - Lambda #1 sends requests to SQS for further processing.
   - Lambda #2 handles write operations when necessary.
   - Lambda #3 processes messages from SQS and writes to DynamoDB.
   



## Run the application
Assuming that your AWS CLI is already configured, run the following:

        npm run install
        cdk deploy

            

To kill the app and all resources run:

        cdk destroy


