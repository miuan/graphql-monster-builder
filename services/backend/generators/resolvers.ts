import { templateFileToText, templateToText } from '../../common/files'
import { SchemaModel, SchemaModelMember, SchemaModelProtectionParam, SchemaModelProtectionType, SchemaModelRelationType, SYSTEM_MODELS } from '../../common/types'
import { firstToLower, getOnlyOneRelatedMember } from '../../common/utils'
import logger from '../../log'
import { BackendDirectory } from '../backendDirectory'

const log = logger.getLogger('resolvers')

const defaultMembers = ['createdAt', 'updatedAt', 'id']

const memberCreateAndRemoveLinks = (model: SchemaModel, member: SchemaModelMember) => {
    const modelName = model.modelName
    const relation = member.relation
    const linkNames = relation.linkNames

    const ret = {
        result: '',
        connect: '',
    }

    const lower = firstToLower(modelName)
    const funcLinkName = linkNames.linkName
    const funcUnlinkName = linkNames.unlinkName

    let protection
    let unlinkProtection = ''
    if (relation.name === '_RoleToUser') {
        const conditions = constructConditionsFromProtection([{ type: SchemaModelProtectionType.ROLE, roles: ['admin'] }])
        protection = compileConditionsToIfStatement(conditions)
        unlinkProtection = `
            if(ctx.state?.user?.id == data.userId){
                if(data.userRoleName === 'admin') {
                    throw new Error('Unlinking yourself from admin')
                } else {
                    const role = await entry.models['userRole'].findById(data.userRoleId, 'name').lean()
                    if(role.name === 'admin') {
                        throw new Error('Unlinking yourself from admin')
                    }
                }
            }
        `
    } else {
        const conditions1 = constructConditionsFromProtection(model.protection.update, linkNames.param1, modelName)
        const conditions2 = constructConditionsFromProtection(relation.relatedModel.protection.update, linkNames.param2, relation.relatedModel.modelName)
        const conditions = [...conditions1, ...conditions2.filter((c2) => !conditions1.includes(c2))]
        protection = compileConditionsToIfStatement(conditions)
    }

    const params = linkNames.param3 ? `data.${linkNames.param1}, data.${linkNames.param2}, data.${linkNames.param3}` : `data.${linkNames.param1}, data.${linkNames.param2}`

    ret.result = templateFileToText('resolvers-add-remove.ts', {
        _LOWER_NAME_: lower,
        _FUNC_LINK_NAME_: funcLinkName,
        _FUNC_UNLINK_NAME_: funcUnlinkName,
        _PARAMS_: params,
        _UNLINK_PROTECTION_: unlinkProtection,
        _PROTECTION_: protection,
    })

    ret.connect += `${funcLinkName} : ${funcLinkName}(entry, protections),\n${funcUnlinkName} : ${funcUnlinkName}(entry, protections),`

    return ret
}

const modelCreateAddRemoveLinks = (model: SchemaModel) => {
    const membersWithRelations = model.members.filter((member) => member.relation?.linkNames)
    const ret = {
        result: '',
        connect: '',
    }

    for (const member of membersWithRelations) {
        const { result, connect } = memberCreateAndRemoveLinks(model, member)

        ret.result += result
        ret.connect += connect
    }
    return ret
}

export const createResolver = (model: SchemaModel) => {
    const modelName = model.modelName
    const lower = modelName.charAt(0).toLowerCase() + modelName.slice(1)
    const varName = lower + 'Service'

    const protectionAll = compileConditionsToIfStatement(constructConditionsFromProtection(model.protection.all, modelName), modelName)
    const protectionOne = compileConditionsToIfStatement(constructConditionsFromProtection(model.protection.one, modelName), modelName)
    const protectionCreate = compileConditionsToIfStatement(constructConditionsFromProtection(model.protection.create, modelName), modelName)
    const protectionUpdate = compileConditionsToIfStatement(constructConditionsFromProtection(model.protection.update, modelName), modelName)
    const protectionRemove = compileConditionsToIfStatement(constructConditionsFromProtection(model.protection.remove, modelName), modelName)

    const { result: _RESOLVERS_ADD_REMOVE_, connect: _RESOLVERS_ADD_REMOVE_CONNECT_ } = modelCreateAddRemoveLinks(model)

    const automaticUserFromCtx = !SYSTEM_MODELS.includes(modelName)
        ? `if(!data.userId && userId){
        data.userId = userId
      }`
        : ''

    const file = templateFileToText('resolvers.ts', {
        _RESOLVERS_ADD_REMOVE_CONNECT_,
        _RESOLVERS_ADD_REMOVE_,
    })

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
        _AUTOMATIC_USER_FROM_CTX_: automaticUserFromCtx,
    })

    result += ''
    return result
}

export const compileConditionsToIfStatement = (conditions: string[], modelName: string = undefined) => {
    const condition = conditions.join('&&')
    let result = `if(${condition}){
        throw new Error('Unauthorized')
      }`

    if (modelName && modelName == 'User') {
        result += `
    if((data.roles || data.rolesIds) && !await protections.role(ctx, ['admin'])){
        throw new Error('Unauthorized user:roles operation')
    }
  `
    }

    return result
}

export const constructConditionsFromProtection = (protections: SchemaModelProtectionParam[], modelName: string = undefined, objectIdField = undefined) => {
    return protections.map((protectionParam) => `!(${generateProtectionFromParam(protectionParam, modelName, objectIdField)})`)
}

export const generateProtectionFromParam = (protection: SchemaModelProtectionParam, modelName: string = undefined, objectIdField = undefined) => {
    let result = ''

    if (protection.type === SchemaModelProtectionType.PUBLIC) {
        result += `await protections.public()`
    } else if (protection.type === SchemaModelProtectionType.USER) {
        result += `await protections.user(ctx)`
    } else if (protection.type === SchemaModelProtectionType.OWNER) {
        // in model user is owner identified by ID
        const param = modelName && modelName === 'User' ? '_id' : 'user'
        result += objectIdField ? `await protections.owner(ctx, data, '${param}', '${objectIdField}')` : `await protections.owner(ctx, data, '${param}')`
    } else if (protection.type === SchemaModelProtectionType.ROLE) {
        const roles = `'` + protection.roles.join(`','`) + `'`
        result += `await protections.role(ctx, [${roles}])`
    } else if (protection.type === SchemaModelProtectionType.FILTER) {
        const roles = protection.roles.length > 0 ? `['` + protection.roles.join(`','`) + `']` : 'null'
        let filters = ''
        for (const filter of protection.filter) {
            filters = `,{name: '${filter.name}', value: '${filter.value}'}`
        }

        result += `await protections.filter(ctx, data, [${filters.substr(1)}], ${roles})`
    }
    return result
}

export const generateResolverToFile = (backendDirectory: BackendDirectory, model: SchemaModel) => {
    const str = createResolver(model)

    backendDirectory.resolversWrite(`${model.modelName}`, str)
}

export const generateResolvers = (backendDirectory: BackendDirectory, models: SchemaModel[]) => {
    log.trace('generateResolvers')
    for (const model of models) {
        log.info(`Generate resolver for model: ${model.modelName}`)
        generateResolverToFile(backendDirectory, model)
    }
}
