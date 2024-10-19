const awsServerlessExpress = require('aws-serverless-express');
const express = require('express');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../../dist/app.module'); // Adjust the path to your main module

async function createNestServer(expressInstance) {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );
  await app.init();
}

const app = express();
createNestServer(app);

const server = awsServerlessExpress.createServer(app);

module.exports.handler = (event, context) => {
  return awsServerlessExpress.proxy(server, event, context);
};
