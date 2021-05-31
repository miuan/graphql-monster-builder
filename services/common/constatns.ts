export const schemaFilterNumberValue = [
    ['not', 'Values that are not equal to given value.'],
    ['in', 'All values that are contained in given list.', true],
    ['not_in', 'All values that are not contained in given list.', true],
    ['lt', 'All values less than the given value.'],
    ['lte', 'All values less than or equal the given value.'],
    ['gt', 'All values greater than the given value.'],
    ['gte', 'All values greater than or equal the given value.'],
]

export const schemaFilterStringValue = [
    ...schemaFilterNumberValue,
    ['contains'],
    ['not_contains'],
    ['starts_with'],
    ['not_starts_with'],
    ['ends_with'],
    ['not_ends_with'],
]

export const schemaFilterArrays = ['every', 'some', 'none']

export const schemaMutations = [
    ['create', 'NO_ID'],
    ['update', 'ALWAYS_ID'],
    // 'updateOrCreate',
    ['remove', 'ONLY_ID'],
]

export const schemaMutationsForRelations = [
    ['addTo', 'RELATION_MEMBER_ONE_TO_MANY'],
    ['removeFrom', 'RELATION_MEMBER_ONE_TO_MANY'],
]

export const schemaOrderBy = ['ASC', 'DESC']

export const notMutationFields = {
    '': ['id', 'createdAt', 'updatedAt'],
    File: ['contentType', 'secret', 'size', 'url'],
}

export const MONGOSEE_RESERVED_WORDS = [
    'on',
    'emit',
    '_events',
    'db',
    'get',
    'set',
    'init',
    'isNew',
    'errors',
    'schema',
    'options',
    'modelName',
    'collection',
    '_pres',
    '_posts',
    'toObject',
]
