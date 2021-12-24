import { convertRestToResolver } from '../api-utils'

export function connect_MODEL_NAME_Api(apiRouter, entry) {
    apiRouter.post('/_MODEL_LOWER_NAME_', convertRestToResolver(entry.resolvers['_MODEL_LOWER_NAME_'].create, 'create_MODEL_NAME_'))
}
