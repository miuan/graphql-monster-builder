
import {ApolloServer, gql} from 'apollo-server-koa'

import * as dotenv from 'dotenv-flow'
import * as fs from 'fs'

import * as Koa from 'koa'
import * as Router from 'koa-router'
import * as cors from '@koa/cors'
import * as koaBody from 'koa-body'
// tslint:disable-next-line:import-name

import * as mongoDB from './gen/services/db'
import { generateResolver } from './gen/entry'
import { createUser, createRole, generateParentLogin } from './gen/extras'

// server specific 
import * as proxy from 'koa-proxy'

import allPassportSetup from './services/passport'

const app: Koa = new Koa()

// load config to `process.env.*` from `.env` file
dotenv.config({
  path: './config/environment'
})

if (!process.env.PORT) {
  console.warn('PORT is not setup, you can use .env file')
}

console.info(`ENVIRONMENT:  process - ${process.env.NODE_ENV}  app - ${app.env}`)

const PORT = process.env.PORT || 3001

// handle errors
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (error) {
    if (!error.status) {
      console.warn(`es: ${error.message}`, error.status, error)
      ctx.status = 500
      ctx.body = {
        title: 'Fatal: Unhandled exception',
        error: {
          error: error.toString(),
          stack: error.stack,
        },
      }

      ctx.app.emit('error', error, ctx)
    } else {
      console.debug(`es: ${error.message}`, error.status, error)
      ctx.status = error.status
      ctx.body = { error }
    }
  }
})

app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  ctx.set('X-Response-Time', `${ms}ms`)
  console.debug(`${ctx.method.substr(10)} ${ctx.url} - ${ms}ms`)
})


app.use(cors({
  origin: '*',
}))
app.use(koaBody({ multipart: true }))

app.on('error', (err) => {
  const date = new Date()
  const timestamp = date.toLocaleString()
  console.error('[server error] ' + timestamp, err)
})

// NOTE: for access graphiql pass token to query
app.use(async (ctx, next) => {
  // if not exists header or header.authorization
  // and otherhand exist query.token
  if ((!ctx.header || !ctx.header.authorization)
    && ctx.request && ctx.request.query && ctx.request.query.token) {

    const header = ctx.header || {}
    header.authorization = 'Bearer ' + ctx.request.query.token
    ctx.request.header = header
  }

  console.log('auth:', ctx.header && ctx.header.authorization ?
    ctx.header.authorization.substr(12) + '...' :
    'none provided',
  )

  await next()
})

allPassportSetup(app)

const {entry, resolvers} = generateResolver({})

////////////////////////////////////////////////////////////////////////////////////////
// PARENT ACCESS
const parentAccess = new Router()
parentAccess.post(`/parent/:parentAccessToken/user/:parentUserId`, generateParentLogin(entry))
app.use(parentAccess.routes())
app.use(parentAccess.allowedMethods())

////////////////////////////////////////////////////////////////////////////////////////
// GRAPHQL
let typeDefs

try {
  const schema = fs.readFileSync('./gen/graphql.schema')
  typeDefs = gql(schema.toString())
} catch(ex) {
  throw ex
  console.error('Graphql Error', ex)
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ ctx }) => (ctx)
})

server.applyMiddleware({ app })

////////////////////////////////////////////////////////////////////////////////////////
// Setup connection to DB

const connOptions = {
  host: process.env.DB_HOST,
  db: process.env.DB_NAME,
}

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', () => {
  mongoDB.close(() => {
    console.debug('Mongoose default connection disconnected through app termination')
    process.exit(0)
  })
})
  
mongoDB.connect(connOptions).then(async () => {
  app.listen(PORT)
  console.info(`listening on port: ${PORT} ${(<any>server).graphqlPath}`)

  const admin_email = process.env.ADMIN_EMAIL || `admin`
  const admin_pass = process.env.ADMIN_PASSWORD || `ADMIN_PASSWORD_${admin_email.length}`
  // TODO: add all roles what is in schema
  const adminRole = await createRole(entry, 'admin')
  const adminUser = await createUser(entry, admin_email, admin_pass, [adminRole.id])
  
})

export default app
