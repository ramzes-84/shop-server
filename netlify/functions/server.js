const { createServer, proxy } = require('aws-serverless-express');
const express = require('express');
const { AppModule } = require('./dist/main'); // Adjust the path to your main module

const app = express();
const server = createServer(app);

module.exports.handler = (event, context) => {
  return proxy(server, event, context);
};
