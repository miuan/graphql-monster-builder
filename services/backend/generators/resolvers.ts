import {
    SchemaModel,
    SchemaModelRelationType,
    StructureBackend,
    SchemaModelMember,
    SchemaModelProtection,
    SchemaModelProtectionParam,
    SchemaModelProtectionType,
} from '../../common/types'

import { writeToFile, templateFileToText, templateToText } from '../../common/files'
import { getOnlyOneRelatedMember, firstToLower } from '../../common/utils'
import { relatedParamName1Id, relatedParamName1, relatedParamName2Id, relatedParamName2 } from './schema'

import logger from '../../log'
import { BackendDirectory } from '../backendDirectory'
const log = logger.getLogger('resolvers')

const defaultMembers = ['createdAt', 'updatedAt', 'id']

const memberCreateAndRemoveLinks = (model: SchemaModel, member: SchemaModelMember) => {
    const modelName = model.modelName
    const relation = member.relation
    const relatedMember = getOnlyOneRelatedMember(member)

    const ret = {
        result: '',
        connect: '',
    }

    if (!relatedMember) {
        return ret
    }

    const lower = firstToLower(modelName)
    const relationName = relation.name
    const funcAddToName = `addTo${relationName}`
    const funcRemoveFromName = `removeFrom${relationName}`

    ret.result = templateFileToText('resolvers-add-remove.ts', {
        _LOWER_NAME_: lower,
        _RELATION_NAME_: relationName,
        _RELATED_PARAM_NAME_1_: relatedParamName1Id(model, relatedMember),
        _RELATED_PARAM_NAME_2_: relatedParamName2Id(member),
        _RELATED_MEMBER_NAME_: relatedMember.name,
        _MEMBER_NAME_: member.name,
        _RELATED_MODEL_NAME_: member.relation.relatedModel.modelName,
        _PAYLOAD_PARAM_1: relatedParamName1(model, relatedMember),
        _PAYLOAD_PARAM_2: relatedParamName2(member),
    })

    ret.connect += `${funcAddToName} : ${funcAddToName}(entry, protections),\n${funcRemoveFromName} : ${funcRemoveFromName}(entry, protections),`

    return ret
}

const modelCreateAddRemoveLinks = (model: SchemaModel) => {
    const membersWithRelations = model.members.filter(
        (member) => member.relation && member.relation.type === SchemaModelRelationType.RELATION,
    )
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

    const protectionAll = generateProtection(modelName, model.protection.all)
    const protectionOne = generateProtection(modelName, model.protection.one)
    const protectionCreate = generateProtection(modelName, model.protection.create)
    const protectionUpdate = generateProtection(modelName, model.protection.update)
    const protectionRemove = generateProtection(modelName, model.protection.remove)

    const { result: serviceAddRemove, connect: serviceAddRemoveConnect } = modelCreateAddRemoveLinks(model)

    const file = templateFileToText('resolvers.ts', {
        _RESOLVERS_ADD_REMOVE_CONNECT_: serviceAddRemoveConnect,
        _RESOLVERS_ADD_REMOVE_: serviceAddRemove,
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
    })

    result += ''
    return result
}

export const generateProtection = (modelName: string, protection: SchemaModelProtectionParam[]) => {
    let condition = ''
    for (const protectionParam of protection) {
        condition += '&& ! (' + generateProtectionFromParam(modelName, protectionParam) + ') '
    }

    let result = `
      if(${condition.substr(3)}){
        ctx.throw(401, 'Unauthorized');
      }
  `

    if (modelName == 'User') {
        result += `
    if((data.roles || data.rolesIds) && await protections.role(ctx, ['admin'])){
      ctx.throw(401, 'Unauthorized user:roles operation');
    }
  `
    }

    return result
}

export const generateProtectionFromParam = (modelName: string, protection: SchemaModelProtectionParam) => {
    let result = ''

    if (protection.type === SchemaModelProtectionType.PUBLIC) {
        result += `await protections.public()`
    } else if (protection.type === SchemaModelProtectionType.USER) {
        result += `await protections.user(ctx)`
    } else if (protection.type === SchemaModelProtectionType.OWNER) {
        // in model user is owner identified by ID
        const param = modelName === 'User' ? 'id' : 'user'
        result += `await protections.owner(ctx, data, '${param}')`
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
