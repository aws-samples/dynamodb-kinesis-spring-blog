# Leveraging Spring Cloud to capture DynamoDB table changes through Kinesis Data Streams Blog Post

This repository contains both the CDK files and the sample application Java code required to run through the blog post example.

## Usage

> [!IMPORTANT]
> The stack requires the sample application code folder to be named `flightApp`. If you intend on running the stack without going through the blog post instructions, then make sure you rename the `sampleAppCode` folder to `flightApp`.

### Pre-requisites

- Latest versions of Node, NPM, Java and Gradle installed.
- Docker installed and daemon running.
- AWS account with the required role, permissions and credentials to deploy the stack.

### Simple deployment
```bash
mkdir dynamodb-stream-blog-post && cd dynamodb-stream-blog-post
git clone https://github.com/aws-samples/dynamodb-kinesis-spring-blog
cd infra
npm install
cdk bootstrap
cdk deploy BaseStack --parameters myPublicIP=<REPLACE_BY_YOUR_PUBLIC_IP>/32
cdk deploy AppStack
```

Please refer to the post for more detailed instructions.
