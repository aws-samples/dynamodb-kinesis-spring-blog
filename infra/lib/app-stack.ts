import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { aws_wafv2 as wafv2 } from 'aws-cdk-lib';

interface IAppStack extends cdk.StackProps {
    webACL: wafv2.CfnWebACL;
    ecsCluster: ecs.Cluster;
}

export class AppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: IAppStack) {

        super(scope, id, props);

        const appRole = new iam.Role(this, 'appRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            description: 'Role for ECS Tasks to interact with the relevant AWS services',
        });

        //Kinesis Stream to capture change from dynamoDB table
        const cdcStream = new kinesis.Stream(this, 'flightsCDCStream', {
            streamName: 'flightsCDCStream',
        })

        //Our DynamoDB table
        const flightTable = new dynamodb.Table(this, 'flight', {
            tableName: 'flight',
            kinesisStream: cdcStream,
            pointInTimeRecovery: true,
            partitionKey: {
                name: 'id',
                type: dynamodb.AttributeType.STRING,
            },
        });
        flightTable.grantReadWriteData(appRole);

        const kinesisPolicy = new iam.Policy(this, 'kinesisPolicy', {
            statements: [new iam.PolicyStatement({
                actions: [
                    "kinesis:DescribeStream",
                    "kinesis:DescribeStreamConsumer",
                    "kinesis:DescribeStreamSummary",
                    "kinesis:GetShardIterator",
                    "kinesis:GetRecords",
                    "kinesis:ListShards",
                    "kinesis:ListStreamConsumers",
                    "kinesis:ListStreams",
                    "kinesis:SubscribeToShard",
                    "kinesis:RegisterStreamConsumer"
                ],
                resources: [`${cdcStream.streamArn}*`],
            })],
        })
        appRole.attachInlinePolicy(kinesisPolicy);

        //Proper permissions to the Cloud Stream DynamoDB tables
        const dynamoDBPolicy = new iam.Policy(this, 'dynamoDBPolicy', {
            statements: [new iam.PolicyStatement({
                actions: [
                    "dynamodb:BatchGetItem",
                    "dynamodb:BatchWriteItem",
                    "dynamodb:PutItem",
                    "dynamodb:GetItem",
                    "dynamodb:Scan",
                    "dynamodb:Query",
                    "dynamodb:UpdateItem",
                    "dynamodb:DescribeTable",
                    "dynamodb:DeleteItem",
                    "dynamodb:CreateTable",
                ],
                resources: [
                    `arn:aws:dynamodb:${this.region}:${this.account}:table/SpringIntegrationMetadataStore`,
                    `arn:aws:dynamodb:${this.region}:${this.account}:table/SpringIntegrationLockRegistry`,
                    `arn:aws:dynamodb:${this.region}:${this.account}:table/group-*`
                ],
            })],
        })
        appRole.attachInlinePolicy(dynamoDBPolicy);

        const cloudWatchPolicy = new iam.Policy(this, 'cloudWatchPolicy', {
            statements: [new iam.PolicyStatement({
                actions: [
                    "cloudwatch:PutMetricData"
                ],
                resources: ["*"]
            })],
        });
        appRole.attachInlinePolicy(cloudWatchPolicy);

        //Our application in AWS Fargate + ALB
        const flightApp = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'FlightAppSvc', {
            cluster: props.ecsCluster,
            desiredCount: 2,
            cpu: 256,
            memoryLimitMiB: 512,
            runtimePlatform: {
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
                cpuArchitecture: ecs.CpuArchitecture.ARM64,
            },
            taskImageOptions: {
                image: ecs.ContainerImage.fromAsset('../flightApp'),
                containerPort: 8080,
                environment: {
                    'kinesisstreamname': cdcStream.streamName,
                    'AWS_REGION': this.region
                },
                taskRole: appRole
            }
        });

        flightApp.loadBalancer.setAttribute('routing.http.drop_invalid_header_fields.enabled', 'true');

        //customize healthcheck on ALB
        flightApp.targetGroup.configureHealthCheck({
            "port": 'traffic-port',
            "path": '/actuator/health',
            "interval": cdk.Duration.seconds(5),
            "timeout": cdk.Duration.seconds(4),
            "healthyThresholdCount": 2,
            "unhealthyThresholdCount": 2,
            "healthyHttpCodes": "200,301,302"
        })

        const cfnWebACLAssociation = new wafv2.CfnWebACLAssociation(this, 'ALBWebACLAssociation', {
            resourceArn: flightApp.loadBalancer.loadBalancerArn,
            webAclArn: props.webACL.attrArn,
        });
    }
}
