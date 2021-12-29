import * as JSON5 from 'json5'
import { apiMiddleware, userIsOwner, userHaveRoles, paramHaveFilter, RequestError, UnauthorizedError } from '../api-utils'

/**
 * _SWAGGER_
 */

const create_MODEL_NAME_ = (entry) => async (ctx) => {
    let body = ctx.request.body

    _PROTECT_CREATE_

    if (entry.hooks.api['beforeCreate_MODEL_NAME_']) {
        body = (await entry.hooks.api['beforeCreate_MODEL_NAME_'](entry, ctx, body)) || body
    }

    body.user = body.user || ctx.state?.user?.id
    let resData = await entry.services['_MODEL_LOWER_NAME_'].create(body, ctx.state?.user?.id)

    if (entry.hooks.api['afterCreate_MODEL_NAME_']) {
        resData = (await entry.hooks.api['afterCreate_MODEL_NAME_'](entry, ctx, resData, body)) || resData
    }

    ctx.body = apiMiddleware(ctx, resData, 'create_MODEL_NAME_')
}

const update_MODEL_NAME_ = (entry) => async (ctx) => {
    let body = ctx.request.body || {}
    // user is owner need id
    body.id = ctx.params.id

    _PROTECT_UPDATE_

    if (entry.hooks.api['beforeUpdate_MODEL_NAME_']) {
        body = (await entry.hooks.api['beforeUpdate_MODEL_NAME_'](entry, ctx, body)) || body
    }

    body.user = body.user || ctx.state?.user?.id
    let resData = await entry.services['_MODEL_LOWER_NAME_'].update(body, ctx.state?.user?.id)

    if (entry.hooks.api['afterUpdate_MODEL_NAME_']) {
        resData = (await entry.hooks.api['afterUpdate_MODEL_NAME_'](entry, ctx, resData, body)) || resData
    }

    ctx.body = apiMiddleware(ctx, resData, 'update_MODEL_NAME_')
}

const remove_MODEL_NAME_ = (entry) => async (ctx) => {
    let body = ctx.request.body || {}
    // user is owner need id
    body.id = ctx.params.id

    _PROTECT_REMOVE_

    if (entry.hooks.api['beforeRemove_MODEL_NAME_']) {
        body = (await entry.hooks.api['beforeRemove_MODEL_NAME_'](entry, ctx, body)) || body
    }

    body.user = body.user || ctx.state?.user?.id
    let resData = await entry.services['_MODEL_LOWER_NAME_'].remove(body.id, ctx.state?.user?.id)

    if (entry.hooks.api['afterRemove_MODEL_NAME_']) {
        resData = (await entry.hooks.api['afterRemove_MODEL_NAME_'](entry, ctx, resData, body)) || resData
    }

    ctx.body = apiMiddleware(ctx, resData, 'remove_MODEL_NAME_')
}

const one_MODEL_NAME_ = (entry) => async (ctx) => {
    let body = ctx.request.body || {}
    // user is owner need id
    body.id = ctx.params.id

    _PROTECT_ONE_

    if (entry.hooks.api['beforeOne_MODEL_NAME_']) {
        body = (await entry.hooks.api['beforeOne_MODEL_NAME_'](entry, ctx, body)) || body
    }

    body.user = body.user || ctx.state?.user?.id
    let resData = await entry.services['_MODEL_LOWER_NAME_'].one(body.id, ctx.state?.user?.id)

    if (entry.hooks.api['afterOne_MODEL_NAME_']) {
        resData = (await entry.hooks.api['afterOne_MODEL_NAME_'](entry, ctx, resData, body)) || resData
    }

    ctx.body = apiMiddleware(ctx, resData, '_MODEL_LOWER_NAME_')
}

const all_MODEL_NAME_ = (entry) => async (ctx) => {
    let body = ctx.request.body || {}
    // user is owner need id
    body.id = ctx.params.id

    _PROTECT_ALL_

    if (entry.hooks.api['beforeAll_MODEL_NAME_']) {
        body = (await entry.hooks.api['beforeAll_MODEL_NAME_'](entry, ctx, body)) || body
    }

    body.user = body.user || ctx.state?.user?.id
    let resData = await entry.services['_MODEL_LOWER_NAME_'].all(ctx.params, ctx.state?.user?.id)
    resData = resData.map((m) => {
        m.id = m._id
        delete m._id
        return m
    })

    if (entry.hooks.api['afterAll_MODEL_NAME_']) {
        resData = (await entry.hooks.api['afterAll_MODEL_NAME_'](entry, ctx, resData, body)) || resData
    }

    ctx.body = apiMiddleware(ctx, resData, 'all_MODEL_NAME_')
}

const count_MODEL_NAME_ = (entry) => async (ctx) => {
    let body = ctx.request.body || {}
    // user is owner need id
    body.id = ctx.params.id

    _PROTECT_ALL_

    if (entry.hooks.api['beforeAll_MODEL_NAME_']) {
        body = (await entry.hooks.api['beforeAll_MODEL_NAME_'](entry, ctx, body)) || body
    }

    body.user = body.user || ctx.state?.user?.id
    const query = ctx.request.query
    if (query.filter) {
        query.filter = JSON5.parse(query.filter)
    }
    let resData = await entry.services['_MODEL_LOWER_NAME_'].count(query, ctx.state?.user?.id)

    if (entry.hooks.api['afterAll_MODEL_NAME_']) {
        resData = (await entry.hooks.api['afterAll_MODEL_NAME_'](entry, ctx, resData, body)) || resData
    }

    ctx.body = apiMiddleware(ctx, resData, 'count_MODEL_NAME_')
}

export function connect_MODEL_NAME_Api(apiRouter, entry) {
    apiRouter.post('/_MODEL_LOWER_NAME_', create_MODEL_NAME_(entry))
    apiRouter.put('/_MODEL_LOWER_NAME_/:id', update_MODEL_NAME_(entry))
    apiRouter.delete('/_MODEL_LOWER_NAME_/:id', remove_MODEL_NAME_(entry))
    apiRouter.get('/_MODEL_LOWER_NAME_/all', all_MODEL_NAME_(entry))
    apiRouter.get('/_MODEL_LOWER_NAME_/count', count_MODEL_NAME_(entry))
    apiRouter.get('/_MODEL_LOWER_NAME_/:id', one_MODEL_NAME_(entry))
}
