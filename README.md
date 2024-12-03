# Team 4 Project : Chat

Team 4's app consists of a CDK (Cloud Development Kit) project written in typescript. The app is a chat app where users can post whatever messages they wish. We utilized key AWS resources to create this app and ensure functionality.

# Project Architecture
We designed our application with public-private split using AWS resources to ensure scalability and security.

### Public Layer
- **API Gateway**: Manages public HTTP endpoints, handling requests like:
  - `GET` to retrieve posts.
  - `POST` to create a new post.
- **Lambda #1**: Serves as the backend for the API Gateway, exposing public endpoints.

### Private Layer
- **SQS**: Acts as a message queue for asynchronous processing of `POST` and `PUT` requests.
- **Lambda #2**: Provides database functions for reads and writes.
- **Lambda #3**: Consumes messages from the SQS queue and writes data to DynamoDB.
- **DynamoDB**: A NoSQL database for storing application data, using a write-through cache strategy for optimal performance.

## Workflow
1. **Frontend**: Sends requests to the API Gateway.
2. **Public Processing**: API Gateway triggers Lambda #1 for public endpoint logic.
3. **Private Processing**:
   - Lambda #1 sends requests to SQS for further processing.
   - Lambda #2 handles database queries when necessary.
   - Lambda #3 processes messages from SQS and writes to DynamoDB.
   

<img src="https://github.com/clydeshtino/AWSApp/blob/main/misc/diagram.png" width="800" />

## Run the application
Assuming that your AWS CLI is already configured run:
        ```npm run install
        ```
        ```
           cdk deploy
          ```
            

To kill the app and all resources run:
      ```
        cdk destroy
          ```

