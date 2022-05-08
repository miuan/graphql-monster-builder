import { generateDataloaders } from './dataloaders'
import { apiMiddleware } from './api-utils'
import * as extras from './extras'
import { registerStorageService } from './storage'

let hooks

try {
    hooks = require(`${process.cwd()}/services/entryHooks.ts`).hooks
} catch (ex) {
    if (ex.code == 'MODULE_NOT_FOUND') {
        hooks = {}
        console.log(`missing ${process.cwd()}/services/entryHooks.ts`)
    } else {
        console.error(ex)
        throw ex
    }
}

export const generateResolver = (setting = {}) => {
    const entry = {
        models: {},
        services: {},
        resolvers: {},
        dataloaders: {},
        hooks: {
            api: {},
            services: {},
            resolvers: {},
        },
        storage: {} as ReturnType<typeof registerStorageService>,
    }

    if (hooks.services) {
        for (const serviceHookName in hooks.services) {
            entry.hooks.services[serviceHookName] = hooks.services[serviceHookName]
        }
    }

    if (hooks.resolvers) {
        for (const serviceHookName in hooks.resolvers) {
            entry.hooks.resolvers[serviceHookName] = hooks.resolvers[serviceHookName]
        }
    }

    _MODELS_BODY_
    _SERVICES_
    _RE1SOLVERS_

    generateDataloaders(entry)

    const resolvers = _RESOLVER_

    return {
        entry,
        resolvers,
    }
}

export function connectApi(apiRouter, entry) {
    //apiRouter.use(apiMiddleware)
    _API_CONNECTORS_
}
