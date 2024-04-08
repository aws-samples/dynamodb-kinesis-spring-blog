#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AppStack } from '../lib/app-stack';
import { BaseStack } from '../lib/base-stack';

const app = new cdk.App();
const baseStack = new BaseStack(app, 'BaseStack', {})
const appStack = new AppStack(app, 'AppStack', {
  webACL: baseStack.webACL,
  ecsCluster: baseStack.ecsCluster
});