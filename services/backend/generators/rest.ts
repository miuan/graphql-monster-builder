import { templateFileToText, templateToText } from '../../common/files'
import { SchemaModel, SchemaModelMember, SchemaModelProtectionParam, SchemaModelProtectionType, SchemaModelRelationType, SYSTEM_MODELS } from '../../common/types'
import { firstToLower, getOnlyOneRelatedMember } from '../../common/utils'
import logger from '../../log'
import { BackendDirectory } from '../backendDirectory'

import * as YAML from 'json2yaml'

const log = logger.getLogger('rest')

const getModelProperties = (members: SchemaModelMember[]) => {
    const properties = {}

    for (const member of members) {
        if (member.name == 'id') {
            properties['id'] = { type: 'integer' }
        } else if (member.type == 'Int' || member.type == 'Float') {
            properties[member.name] = { type: 'integer' }
        } else {
            properties[member.name] = { type: 'string' }
        }
    }

    return properties
}

const genSwaggerJSON = (model: SchemaModel) => {
    const lower = firstToLower(model.modelName)
    return {
        components: {
            parameters: {
                FieldParam: {
                    name: 'fields',
                    in: 'query',
                    type: 'array',
                    collectionType: 'csv',
                    items: { type: 'string' },
                },
                AliasParam: {
                    name: 'alias',
                    in: 'query',
                    type: 'string',
                },
                SortParam: {
                    name: 'sort',
                    in: 'query',
                    type: 'string',
                },
                FilterParam: {
                    name: 'filter',
                    in: 'query',
                    type: 'string',
                },
                IdParam: {
                    name: 'id',
                    in: 'path',
                    type: 'string',
                },
            },
            schemas: {
                [model.modelName]: { type: 'object', properties: getModelProperties(model.members) },
            },
        },
        paths: {
            [`/api/${lower}/all`]: {
                get: {
                    tags: [model.modelName, 'all', 'query'],
                    summary: `Retrive all ${model.modelName}`,
                    parameters: [
                        { $ref: '#/components/parameters/FieldParam' },
                        { $ref: '#/components/parameters/AliasParam' },
                        { $ref: '#/components/parameters/SortParam' },
                        { $ref: '#/components/parameters/FilterParam' },
                    ],
                    responses: {
                        '200': {
                            description: `List of ${model.modelName}`,
                            content: { ['application/json']: { schema: { type: 'array', items: { $ref: `#/components/schemas/${model.modelName}` } } } },
                        },
                    },
                },
            },
            [`/api/${lower}/owned`]: {
                get: {
                    tags: [model.modelName, 'owned', 'query'],
                    summary: `Retrive only owned (my) ${model.modelName}`,
                    parameters: [
                        { $ref: '#/components/parameters/FieldParam' },
                        { $ref: '#/components/parameters/AliasParam' },
                        { $ref: '#/components/parameters/SortParam' },
                        { $ref: '#/components/parameters/FilterParam' },
                    ],
                    responses: {
                        '200': {
                            description: `List of ${model.modelName}`,
                            content: { ['application/json']: { schema: { type: 'array', items: { $ref: `#/components/schemas/${model.modelName}` } } } },
                        },
                    },
                },
            },
            [`/api/${lower}/count`]: {
                get: {
                    tags: [model.modelName, 'count', 'query'],
                    summary: `Count of ${model.modelName}`,
                    parameters: [{ $ref: '#/components/parameters/AliasParam' }, { $ref: '#/components/parameters/SortParam' }, { $ref: '#/components/parameters/FilterParam' }],
                    responses: {
                        '200': {
                            description: `Count of ${model.modelName}`,
                            content: { ['application/json']: { schema: { type: 'integer' } } },
                        },
                    },
                },
            },
            [`/api/${lower}`]: {
                post: {
                    tags: [model.modelName, 'create', 'mutation'],
                    summary: `Create ${model.modelName} with id`,
                    parameters: [{ $ref: '#/components/parameters/FieldParam' }, { $ref: '#/components/parameters/AliasParam' }],
                    requestBody: {
                        content: {
                            ['application/json']: {
                                schema: { $ref: `#/components/schemas/${model.modelName}` },
                            },
                        },
                    },
                    responses: {
                        '200': {
                            description: `updated model ${model.modelName}`,
                            content: { ['application/json']: { schema: { $ref: `#/components/schemas/${model.modelName}` } } },
                        },
                    },
                },
            },
            [`/api/${lower}/{id}`]: {
                get: {
                    tags: [model.modelName, 'one', 'query'],
                    summary: `Retrive one ${model.modelName} by id`,
                    parameters: [{ $ref: '#/components/parameters/FieldParam' }, { $ref: '#/components/parameters/AliasParam' }, { $ref: '#/components/parameters/IdParam' }],
                    responses: {
                        '200': {
                            description: `One ${model.modelName}`,
                            content: { ['application/json']: { schema: { $ref: `#/components/schemas/${model.modelName}` } } },
                        },
                    },
                },
                put: {
                    tags: [model.modelName, 'update', 'mutation'],
                    summary: `Update ${model.modelName} with id`,
                    parameters: [{ $ref: '#/components/parameters/FieldParam' }, { $ref: '#/components/parameters/AliasParam' }, { $ref: '#/components/parameters/IdParam' }],
                    requestBody: {
                        content: {
                            ['application/json']: {
                                schema: { $ref: `#/components/schemas/${model.modelName}` },
                            },
                        },
                    },
                    responses: {
                        '200': {
                            description: `updated model ${model.modelName}`,
                            content: { ['application/json']: { schema: { $ref: `#/components/schemas/${model.modelName}` } } },
                        },
                    },
                },
                delete: {
                    tags: [model.modelName, 'delete', 'mutation'],
                    summary: `Delete ${model.modelName} with id`,
                    parameters: [{ $ref: '#/components/parameters/FieldParam' }, { $ref: '#/components/parameters/AliasParam' }, { $ref: '#/components/parameters/IdParam' }],
                    responses: {
                        '200': {
                            description: `updated model ${model.modelName}`,
                            content: { ['application/json']: { schema: { $ref: `#/components/schemas/${model.modelName}` } } },
                        },
                    },
                },
            },
        },
    }
}

const genSwagger = (model) => {
    const contentRow = YAML.stringify(genSwaggerJSON(model)).split('\n')

    contentRow.pop()
    contentRow.shift()

    const content = contentRow.map((row) => ` * ${row.substr(2)}`).join('\n')

    return `@swagger
${content}`
}

export const createRest = (model: SchemaModel) => {
    const modelName = model.modelName
    const lower = modelName.charAt(0).toLowerCase() + modelName.slice(1)
    const varName = lower + 'Service'

    const protectionAll = compileConditionsToIfStatement(constructConditionsFromProtection(model.protection.all, modelName), modelName)
    const protectionOne = compileConditionsToIfStatement(constructConditionsFromProtection(model.protection.one, modelName), modelName)
    const protectionCreate = compileConditionsToIfStatement(constructConditionsFromProtection(model.protection.create, modelName), modelName)
    const protectionUpdate = compileConditionsToIfStatement(constructConditionsFromProtection(model.protection.update, modelName), modelName)
    const protectionRemove = compileConditionsToIfStatement(constructConditionsFromProtection(model.protection.remove, modelName), modelName)

    const file = templateFileToText('api/rest.t.ts', {})

    const modelUpperName = modelName[0].toUpperCase() + modelName.substr(1)

    let result = templateToText(file, {
        _SWAGGER_: genSwagger(model),
        _MODEL_NAME_: modelName,
        _MODEL_UPPER_NAME_: modelUpperName,
        _MODEL_LOWER_NAME_: lower,
        _PROTECT_ALL_: protectionAll,
        _PROTECT_ONE_: protectionOne,
        _PROTECT_CREATE_: protectionCreate,
        _PROTECT_UPDATE_: protectionUpdate,
        _PROTECT_REMOVE_: protectionRemove,
    })

    result += ''
    return result
}

export const compileConditionsToIfStatement = (conditions: string[], modelName: string = undefined) => {
    let result = ''

    if (conditions?.length) {
        const condition = conditions.join('&&')
        result = `if( ${condition} ){
            throw new UnauthorizedError()
          }`
    }

    if (modelName == 'User') {
        result += `
    if(body.roles && !await userHaveRoles(ctx, ['admin'], entry.models.userRole)){
        throw new RequestError('Unauthorized user:roles operation', 401)
    }
  `
    }

    return result
}

export const constructConditionsFromProtection = (protections: SchemaModelProtectionParam[], modelName: string = undefined, objectIdField = undefined) => {
    // if one of protection is public, any other doesn't make sence
    if (protections.some((p) => p.type == SchemaModelProtectionType.PUBLIC)) {
        return null
    }

    return protections.map((protectionParam) => `!(${generateProtectionFromParam(protectionParam, modelName, objectIdField)})`)
}

export const generateProtectionFromParam = (protection: SchemaModelProtectionParam, modelName: string = undefined, objectIdField = undefined) => {
    let result = ''
    const lower = firstToLower(modelName)

    if (protection.type === SchemaModelProtectionType.USER) {
        result += `ctx?.state?.user?.id`
    } else if (protection.type === SchemaModelProtectionType.OWNER) {
        // in model user is owner identified by ID
        const param = modelName && modelName === 'User' ? '_id' : 'user'
        result += objectIdField
            ? `await userIsOwner(ctx, body, entry.models.${lower}, entry.models.userRole, '${param}', '${objectIdField}')`
            : `await userIsOwner(ctx, body, entry.models.${lower}, entry.models.userRole, '${param}')`
    } else if (protection.type === SchemaModelProtectionType.ROLE) {
        const roles = `'` + protection.roles.join(`','`) + `'`
        result += `await userHaveRoles(ctx, [${roles}], entry.models.userRole)`
    } else if (protection.type === SchemaModelProtectionType.FILTER) {
        const roles = protection.roles.length > 0 ? `['` + protection.roles.join(`','`) + `']` : 'null'
        let filters = ''
        for (const filter of protection.filter) {
            filters = `,{name: '${filter.name}', value: '${filter.value}'}`
        }

        result += `await paramHaveFilter(ctx, ctx.request.params, [${filters.substr(1)}], ${roles})`
    }
    return result
}

export const generateRestToFile = (backendDirectory: BackendDirectory, model: SchemaModel) => {
    const str = createRest(model)

    backendDirectory.apiWrite(`${model.modelName}`, str)
}

export const generateRest = (backendDirectory: BackendDirectory, models: SchemaModel[]) => {
    log.trace('generateResolvers')
    for (const model of models) {
        log.info(`Generate resolver for model: ${model.modelName}`)
        generateRestToFile(backendDirectory, model)
    }
}
