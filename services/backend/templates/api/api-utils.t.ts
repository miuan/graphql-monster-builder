export class RequestError extends Error {
    status: number

    constructor(name = 'RequestError', status = 400) {
        super(name)
        this.name = name
        this.status = status
    }
}

export class UnauthorizedError extends RequestError {
    unauthorized: boolean

    constructor() {
        super('Unauthorized', 401)
        this.unauthorized = true
    }
}

export class TokenExpiredError extends UnauthorizedError {
    tokenExpired: boolean
    status: number

    constructor() {
        super()
        this.tokenExpired = true
    }
}

/**
 * provide query param `fields` and `alias`
 * @param ctx
 * @param data
 * @param aliasDefault
 * @returns
 */
export const apiMiddleware = (ctx, data, aliasDefault) => {
    const fields = ctx.query?.fields || []
    data.id = data._id
    delete data._id

    for (const key in data) {
        if (key.startsWith('__') || (fields?.length && !fields.includes(key))) delete data[key]
    }

    const alias = ctx.query?.alias !== undefined ? ctx.query?.alias : aliasDefault

    return alias ? { [alias]: data } : data
}

export const convertRestToResolver = (resolver, name) => async (ctx) => {
    ctx.body = apiMiddleware(ctx, await resolver(null, ctx.request.body, ctx), name)
}