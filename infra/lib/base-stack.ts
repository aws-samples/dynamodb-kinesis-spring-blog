import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as logs from "aws-cdk-lib/aws-logs"
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { aws_wafv2 as wafv2 } from 'aws-cdk-lib';

export class BaseStack extends cdk.Stack {

  public readonly webACL: wafv2.CfnWebACL;
  public readonly ecsCluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {

    super(scope, id, props);

    // Parameters
    const myPublicIP = new cdk.CfnParameter(this, "myPublicIP", {
      type: "String",
      description: "The public IP used to access the API."});

    // Our VPC
    const cwLogs = new logs.LogGroup(this, 'Log', {
      logGroupName: '/aws/vpc/flowlogs',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const vpc = new ec2.Vpc(this, "FlightAppVPC", {
      maxAzs: 2,
      natGateways: 1,
      flowLogs: {
        's3': {
          destination: ec2.FlowLogDestination.toCloudWatchLogs(cwLogs),
          trafficType: ec2.FlowLogTrafficType.ALL,
        }
      }
    });

    // WebACL and WAF definition (to protect our ALB)
    const allowListIPSet = new wafv2.CfnIPSet(this, "AllowListIPSet", {
      name: "AllowListIPSet",
      addresses: [myPublicIP.valueAsString],
      ipAddressVersion: "IPV4",
      scope: "REGIONAL",
    });
    const allowListIPSetRuleProperty: wafv2.CfnWebACL.RuleProperty = {
      priority: 0,
      name: "AllowListIPSet-Rule",
      action: {
        allow: {},
      },
      statement: {
        ipSetReferenceStatement: {
          arn: allowListIPSet.attrArn,
        },
      },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "AllowListIPSet-Rule",
        sampledRequestsEnabled: true,
      },
    };
    this.webACL = new wafv2.CfnWebACL(this, "WebAcl", {
      name: "WebAcl",
      defaultAction: { block: {} },
      scope: "REGIONAL",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "WebAcl",
        sampledRequestsEnabled: true,
      },
      rules: [allowListIPSetRuleProperty],
    });

    //Our ECS Fargate Cluster in this VPC
    this.ecsCluster = new ecs.Cluster(this, "ecs-cluster", {
      vpc: vpc,
      clusterName: "ecsCluster",
      containerInsights: true,
    })
    
  }
}