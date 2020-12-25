import * as mongoose from 'mongoose'
import * as _ from 'lodash'

// is it for healt check
export const status = {
  connection: 'unknown',
  status: 'not connect',
  lastError: null,
}

// Create the database connection
export const connect = (options): Promise<any> => {

  const host = _.get(options, 'host', 'localhost')
  const db = _.get(options, 'db', 'protectql')

  const connURI = `mongodb://${host}:27017/${db}`
  console.debug(options)
  console.debug(connURI)

  status.connection = connURI

  // mongoose.plugin((schema) => { schema.options.usePushEach = true })

  // CONNECTION EVENTS
  // When successfully connected
  mongoose.connection.on('connected', (data) => {
    console.log(data)
    status.status = 'connected'
    console.debug('Mongoose default connection open to ' + connURI)
  })

  // If the connection throws an error
  mongoose.connection.on('error', (err) => {
    status.lastError = err
    console.error('Mongoose default connection error: ', err)
  })

  // When the connection is disconnected
  mongoose.connection.on('disconnected', () => {
    status.status = 'disconnected'
    console.debug('Mongoose default connection disconnected')
  })

  return mongoose.connect(connURI, { useNewUrlParser: true })
}

// If the Node process ends, close the Mongoose connection
export const close = (cb) => {
  mongoose.connection.close(() => {
    cb()
  })
}

export const disconnect = () => {
  mongoose.disconnect()
}

export const disconnectAndWait = async () => {
  mongoose.disconnect()

  while(status.status != 'disconnected'){
    await new Promise((resolved, rejected) => setTimeout(resolved, 100))
  }
}