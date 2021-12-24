import { ApolloServer, gql } from 'apollo-server-koa'

import * as dotenv from 'dotenv-flow'
import * as fs from 'fs'

import * as Koa from 'koa'
import * as Router from 'koa-router'
import * as cors from '@koa/cors'
import * as koaBody from 'koa-body'
// tslint:disable-next-line:import-name

import * as mongoDB from './gen/services/db'
import { generateResolver, connectApi } from './gen/entry'
import { createUser, createRole, generateParentLogin } from './gen/extras'

// server specific
import * as proxy from 'koa-proxy'

import { setupAuth } from './gen/api-auth'
import setupPassport from './services/passport'
import { generateHash } from './gen/extras'
import { registerStorageService, registerStorageRouter } from './gen/storage'
import { registerSendMailService } from './services/sendMail'
import * as swaggerJSDoc from 'swagger-jsdoc'
import { ui } from 'swagger2-koa'

const app: Koa = new Koa()

// load config to `process.env.*` from `.env` file
dotenv.config({
    path: './config/environment',
})

if (!process.env.PORT) {
    console.warn('PORT is not setup, you can use .env file')
}
const PORT = process.env.PORT || 3001

app.on('error', (err) => {
    const date = new Date()
    const timestamp = date.toLocaleString()
    console.error('[server error] ' + timestamp, err)
})

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', () => {
    mongoDB.close(() => {
        console.debug('Mongoose default connection disconnected through app termination')
        process.exit(0)
    })
})

// handle errors
app.use(async (ctx, next) => {
    try {
        await next()
    } catch (error) {
        if (error.tokenExpired) {
            ctx.body = {
                data: {},
                errors: [error],
            }
        } else if (!error.status) {
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
            ctx.body = { errors: [error] }
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

app.use(
    cors({
        origin: '*',
    }),
)
app.use(koaBody({ multipart: true }))

const { entry, resolvers } = generateResolver({})

////////////////////////////////////////////////////////////////////////////////////////
// AUTH LOGIN and PASSPORTS
const authRouter = setupAuth(app, entry.models['user'])
const publicPassportConfig = setupPassport(authRouter, entry.models['user'], {
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
    SERVICE_URL: process.env.SERVICE_URL,
})
app.use(authRouter.routes())
app.use(authRouter.allowedMethods())

////////////////////////////////////////////////////////////////////////////////////////
// API
const apiRouter = new Router({ prefix: '/api' })
connectApi(apiRouter, entry)
app.use(apiRouter.routes())
app.use(apiRouter.allowedMethods())

////////////////////////////////////////////////////////////////////////////////////////
// GRAPHQL
let typeDefs

try {
    const schema = fs.readFileSync('./gen/graphql.schema')
    typeDefs = gql(schema.toString())
} catch (ex) {
    throw ex
    console.error('Graphql Error', ex)
}

const apollo = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ ctx }) => ctx,
})

apollo.applyMiddleware({ app })

////////////////////////////////////////////////////////////////////////////////////////
// SWAGGER
const swaggerDefinition = {
    info: {
        title: 'REST API for my App', // Title of the documentation
        version: '1.0.0', // Version of the app
        description: 'This is the REST API for my product', // short description of the app
    },
    host: 'localhost:3001', // the host or url of the app
}

// options for the swagger docs
const options = {
    // import swaggerDefinitions
    swaggerDefinition,
    explorer: true,

    // path to the API docs
    apis: ['**/*.ts'],
}

const swaggerSpec = swaggerJSDoc(options)
app.use(ui(swaggerSpec as any, '/swagger'))

////////////////////////////////////////////////////////////////////////////////////////
// EMAIL
entry['email'] = registerSendMailService({
    SERVICE_NAME: process.env.SERVICE_NAME,
    REPLY_EMAIL: process.env.REPLY_EMAIL,
    SERVICE_URL: process.env.SERVICE_URL,
    EMAIL_WELLCOME_TITLE: process.env.EMAIL_WELLCOME_TITLE,
    EMAIL_WELLCOME_MESSAGE: process.env.EMAIL_WELLCOME_MESSAGE,
    EMAIL_FORGOTTEN_PASSWORD_TITLE: process.env.EMAIL_FORGOTTEN_PASSWORD_TITLE,
    EMAIL_FORGOTTEN_PASSWORD_MESSAGE: process.env.EMAIL_FORGOTTEN_PASSWORD_MESSAGE,
})

////////////////////////////////////////////////////////////////////////////////////////
// STORAGE
const storageTargetDir = process.env.STORAGE_DIR || './file-storage/'
if (!fs.existsSync(storageTargetDir)) {
    fs.mkdirSync(storageTargetDir, { recursive: true })
}

// TODO: please introduce better solution that with this entry
entry['storage'] = registerStorageService(entry.models['file'], storageTargetDir)

const storageRouter = new Router('/storage')
registerStorageRouter(entry, storageRouter, storageTargetDir)
app.use(storageRouter.routes())
app.use(storageRouter.allowedMethods())

////////////////////////////////////////////////////////////////////////////////////////
// HEALTCHECK
const healthCheck = new Router()
healthCheck.get(`/health`, (ctx) => {
    ctx.body = {
        health: 'ok',
        service: {
            SERVICE_NAME: process.env.SERVICE_NAME,
            SERVICE_URL: process.env.SERVICE_URL,
            REPLY_EMAIL: process.env.REPLY_EMAIL,
        },
        passport: publicPassportConfig,
    }
})
app.use(healthCheck.routes())
app.use(healthCheck.allowedMethods())

export async function updateAdminUser(rawPassword = true) {
    const admin_email = process.env.ADMIN_EMAIL || `admin`
    const admin_pass = process.env.ADMIN_PASSWORD || `ADMIN_PASSWORD_${admin_email.length}`

    const admin_pass_raw = rawPassword ? admin_pass : await generateHash(admin_pass)

    // TODO: add all roles what is in schema
    const adminRole = await createRole(entry, 'admin')
    const adminUser = await createUser(entry, admin_email, admin_pass_raw, [adminRole._id])
    return [adminUser, adminRole]
}

export const connectionPromise = new Promise((resolve, reject) => {
    const connOptions = {
        host: process.env.DB_HOST,
        db: process.env.DB_NAME || 'db_graphql_monster',
    }

    mongoDB.connect(connOptions).then(async () => {
        await updateAdminUser()

        const koa = app.listen(PORT)
        console.info(`listening on port: ${PORT} ${apollo.graphqlPath}`)

        resolve({ koa, mongoDB, apollo, entry })
    })
})

connectionPromise

export default app
