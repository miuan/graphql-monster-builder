/**
 * One MongoDB connection approach
 */

import * as mongoose from './mongoose';

mongoose.Promise = global.Promise;

import * as _ from './lodash';
import * as dotenv from './dotenv';

const ValidationError  = mongoose.Error.ValidationError;
const ValidatorError  = mongoose.Error.ValidatorError;

dotenv.config();

// is it for healt check
export const status = {
  connection: 'unknown',
  status: 'not connect',
  lastError: null,
};

// Create the database connection
export const connect = (options): Promise<any> => {

  const host = _.get(options, 'host', 'localhost');
  const db = _.get(options, 'db', 'protectql');

  const connURI = `mongodb://${host}:27017/${db}`;
  console.debug(options);
  console.debug(connURI);

  status.connection = connURI;

  mongoose.plugin((schema) => { schema.options.usePushEach = true; });

  // CONNECTION EVENTS
  // When successfully connected
  mongoose.connection.on('connected', (data) => {
    console.log(data);
    status.status = 'connected';
    console.debug('Mongoose default connection open to ' + connURI);
  });

  // If the connection throws an error
  mongoose.connection.on('error', (err) => {
    status.lastError = err;
    console.error('Mongoose default connection error: ', err);
  });

  // When the connection is disconnected
  mongoose.connection.on('disconnected', () => {
    status.status = 'disconnected';
    console.debug('Mongoose default connection disconnected');
  });


  // If the Node process ends, close the Mongoose connection
  process.on('SIGINT', () => {
    mongoose.connection.close(() => {
      console.debug('Mongoose default connection disconnected through app termination');
      process.exit(0);
    });
  });

  return mongoose.connect(connURI, { useNewUrlParser: true });
};

export const disconnect = () => {
  mongoose.disconnect();
};

export const throwValidationError = (path, message, value, type) => {
  const err = new ValidationError(null);
  err.errors[path] = new ValidatorError({
    path,
    value,
    message,
    type,
  });
  throw(err);
};
