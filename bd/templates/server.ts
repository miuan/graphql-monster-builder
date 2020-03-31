import * as Koa from 'koa';
import { graphqlKoa, graphiqlKoa } from 'apollo-server-koa';
import * as Router from 'koa-router';
import * as dotenv from 'dotenv';
import * as cors from 'koa2-cors';
import * as koaBody from 'koa-body';
import * as jwt from 'koa-jwt';
import { IResolvers } from 'graphql-tools/dist/Interfaces';
import { schemaLoad } from './gen/schemaLoad';
// tslint:disable-next-line:import-name

import * as mongoDB from './gen/services/db';
import { generateResolver } from './gen/entry';
import { makeExecutableSchema } from 'graphql-tools';

// TODO: reimplement server.ts for koa version 2
const app: Koa = new Koa();

// load config to `process.env.*` from `.env` file
dotenv.config();

if (!process.env.PORT) {
  console.warn('PORT is not setup, you can use .env file');
}

console.info(`ENVIRONMENT:  process - ${process.env.NODE_ENV}  app - ${app.env}`);

const PORT = process.env.PORT || 3001;

// handle errors
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    if (!error.status) {
      console.warn(`es: ${error.message}`, error.status, error);
      ctx.status = 500;
      ctx.body = {
        title: 'Fatal: Unhandled exception',
        error: {
          error: error.toString(),
          stack: error.stack,
        },
      };

      ctx.app.emit('error', error, ctx);
    } else {
      console.debug(`es: ${error.message}`, error.status, error);
      ctx.status = error.status;
      ctx.body = { error };
    }
  }
});

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
  console.debug(`${ctx.method.substr(10)} ${ctx.url} - ${ms}ms`);
});

app.use(cors({
  origin: '*',
}));
app.use(koaBody({ multipart: true }));

app.on('error', (err) => {
  const date = new Date();
  const timestamp = date.toLocaleString();
  console.error('[server error] ' + timestamp, err);
});

// NOTE: for access graphiql pass token to query
app.use(async (ctx, next) => {
  // if not exists header or header.authorization
  // and otherhand exist query.token
  if ((!ctx.header || !ctx.header.authorization)
    && ctx.request && ctx.request.query && ctx.request.query.token) {

    const header = ctx.header || {};
    header.authorization = 'Bearer ' + ctx.request.query.token;
    ctx.request.header = header;
  }

  console.log('auth:', ctx.header && ctx.header.authorization ?
    ctx.header.authorization.substr(12) + '...' :
    'none provided',
  );

  await next();
});

app.use(jwt({
  secret: process.env.JWT_TOKEN_SECRET || 'protectql_test_secret',
  passthrough: true,
}).unless({
  path: [/^\/v1\/graphiql/, /^\/public/],
}));


const graphRouter = new Router();

const resolver = generateResolver({});

const exsch = schemaLoad(resolver.resolver, './gen/graphql.schema');

graphRouter.post(`/entry/graphql`, graphqlKoa((ctx) => {
  return {
    schema: exsch,
    context: ctx,
  };
}));


graphRouter.get(`/entry/graphiql`, graphiqlKoa({ endpointURL: `/entry/graphql` }));

app.use(graphRouter.routes());
app.use(graphRouter.allowedMethods());

if (!module.parent) {

  const connOptions = {
    host: process.env.DB_HOST,
    db: process.env.DB_NAME,
  };

  mongoDB.connect(connOptions).then(async () => {
    app.listen(PORT);
    console.info(`listening on port: ${PORT}`);

    const userModel = resolver.entry.models['user']
    const user = await userModel.find({email: 'admin'})

    if(user.length < 1) {
      const userService = resolver.entry.services['user']
      const created = await userService.create({email: 'admin', password: 'admin', roles: {
        role: 'admin'
      }})
      console.log('user', user, created)
    }
  });
}

export default app;
