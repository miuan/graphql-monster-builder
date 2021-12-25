import { apiMiddleware, userIsOwner, userHaveRoles, RequestError, UnauthorizedError } from '../api-utils'

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

export function connect_MODEL_NAME_Api(apiRouter, entry) {
    apiRouter.post('/_MODEL_LOWER_NAME_', create_MODEL_NAME_(entry))
}
