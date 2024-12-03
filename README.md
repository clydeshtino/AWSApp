# Team 4 Project : Chat MVP

Team 4's app consists of a CDK (Cloud Development Kit) project written in typescript. The app is a chat app where users can post whatever messages they wish. We utilized key AWS resources to create this app and ensure functionality.

## Project Architecture
We designed our application with public-private split using AWS resources to ensure scalability and security.

### Public Layer
- **API Gateway**: Manages public HTTP endpoints, handling requests like:
  - `GET` to retrieve posts.
  - `POST` to create a new post.
- **S3**: Serves our static front-end page files.
- **Cloudfront**: Acts as a Content Delivery Network (CDN), distributes our static files that are hosted by S3.
- **Lambda #1**: Serves as the backend for the API Gateway, exposing our public endpoints.


### Private Layer
- **SQS**: Acts as a message queue for asynchronous processing of `POST` requests.
- **Lambda #2**: Provides database functions for write-only.
- **Lambda #3**: Consumes messages from the SQS queue and writes data to DynamoDB.
- **DynamoDB**: Serves as the applications primary NoSQL Database.


## Workflow
1. **Frontend**: Sends requests to the API Gateway.
2. **Public Processing**: API Gateway triggers Lambda #1 for public endpoint logic.
3. **Private Processing**:
   - Lambda #1 sends requests to SQS for further processing.
   - Lambda #2 handles write operations when necessary.
   - Lambda #3 processes messages from SQS and writes to DynamoDB.
   



## Run the application
Assuming that your AWS CLI is already configured run:
        npm run install
        cdk deploy

            

To kill the app and all resources run:
        cdk destroy


