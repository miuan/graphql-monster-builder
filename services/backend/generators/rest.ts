import { templateFileToText, templateToText } from '../../common/files'
import { SchemaModel, SchemaModelMember, SchemaModelProtectionParam, SchemaModelProtectionType, SchemaModelRelationType, SYSTEM_MODELS } from '../../common/types'
import { firstToLower, getOnlyOneRelatedMember } from '../../common/utils'
import logger from '../../log'
import { BackendDirectory } from '../backendDirectory'

const log = logger.getLogger('rest')

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
