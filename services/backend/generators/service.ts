import { templateFileToText } from '../../common/files'
import { SchemaModel, SchemaModelMember, SchemaModelRelationType, SchemaModelType } from '../../common/types'
import { firstToLower, getOnlyOneRelatedMember } from '../../common/utils'
import logger from '../../log'
import { BackendDirectory } from '../backendDirectory'

const log = logger.getLogger('service')

const defaultMembers = ['createdAt', 'updatedAt', 'id']

const memberCreateAndRemoveLinks = (model: SchemaModel, member: SchemaModelMember) => {
    const modelName = model.modelName
    const relation = member.relation
    const linkNames = relation.linkNames

    const ret = {
        result: '',
        connect: '',
    }

    if (!linkNames) {
        return ret
    }

    const lower = firstToLower(modelName)
    const relationName = relation.name
    const relatedModelName = member.relation.relatedModel.modelName
    const relatedMemberName = member.relation.relatedMember.name

    ret.result = templateFileToText('service-add-remove.ts', {
        _LOWER_NAME_: lower,
        _RELATION_NAME_: relationName,
        _RELATED_PARAM_NAME_1_: linkNames.param1,
        _RELATED_PARAM_NAME_2_: linkNames.param2,
        _PAYLOAD_PARAM_1_: linkNames.res1,
        _PAYLOAD_PARAM_2_: linkNames.res2,
        _FUNC_LINK_NAME_: linkNames.linkName,
        _FUNC_UNLINK_NAME_: linkNames.unlinkName,
        _RELATED_MEMBER_NAME_: relatedMemberName,
        _MEMBER_NAME_: member.name,
        _LOWER_RELATED_MODEL_NAME_: firstToLower(relatedModelName),
        _RELATED_MODEL_NAME_: relatedModelName,
    })

    ret.connect += `${linkNames.linkName} : ${linkNames.linkName}(entry),\n${linkNames.unlinkName} : ${linkNames.unlinkName}(entry),`

    return ret
}

const modelCreateAddRemoveLinks = (model: SchemaModel, membersWithRelation: SchemaModelMember[]) => {
    const ret = {
        result: '',
        connect: '',
    }

    for (const member of membersWithRelation) {
        const { result, connect } = memberCreateAndRemoveLinks(model, member)

        ret.result += result
        ret.connect += connect
    }
    return ret
}

export const createService = (model: SchemaModel) => {
    const modelName = model.modelName
    const lower = firstToLower(modelName)
    const varName = lower + 'Model'

    const membersWithRelation = model.members.filter((member) => member.relation?.type === SchemaModelRelationType.RELATION)

    const allIdsConversionsCreate = conversionsIdsToField(membersWithRelation, true)
    const allIdsConversionsUpdate = conversionsIdsToField(membersWithRelation, false)
    const connectRelationCreate = updateLinkedModels(membersWithRelation, 'createdModel.id')
    const connectRelationUpdate = updateLinkedModels(membersWithRelation, 'updatedModel.id')
    const disconnectRelations = disconnectLinkedModels(modelName, membersWithRelation)
    const disconnectRelationsInRemove = disconnectLinkedModels(modelName, membersWithRelation, true)
    const { result: serviceAddRemove, connect: serviceAddRemoveConnect } = modelCreateAddRemoveLinks(model, membersWithRelation)

    let actionBeforeCreate = ''
    let actionAfterCreate = ''
    let actionBeforeUpdate = ''
    let actionBeforeRemove = ''

    if (modelName === 'User') {
        actionBeforeCreate = `
    if(data.password) {
      data.__password = await extras.generateHash(data.password);
      data.password = '******';
    }
`
        actionAfterCreate = ``
        actionBeforeUpdate = 'extras.checkPasswordIsNotIncluded(data);'
    }

    if (modelName === 'File') {
        actionBeforeCreate = `if (data.data) await entry.storage.saveDataToFile(null, data)`
        actionBeforeUpdate = 'if (data.data) await entry.storage.saveDataToFile(id, data)'
        actionBeforeRemove = 'await entry.storage.unlinkFile(id)'
    }

    let result = templateFileToText(`service.ts`, {
        _MODEL_NAME_: modelName,
        _LOWER_NAME_: lower,
        VAR_NAME: varName,
        _ALL_IDS_CONVERSIONS_CREATE_: allIdsConversionsCreate,
        _ALL_IDS_CONVERSIONS_UPDATE_: allIdsConversionsUpdate,
        _CONNECT_RELATION_CREATE_: connectRelationCreate,
        _CONNECT_RELATION_UPDATE_: connectRelationUpdate,

        _DISCONNECT_RELATIONS_IN_REMOVE: disconnectRelationsInRemove,
        _DISCONNECT_RELATIONS_: disconnectRelations,

        _EXTRA_ACTION_BEFORE_CREATE_: actionBeforeCreate,
        _EXTRA_ACTION_AFTER_CREATE_: actionAfterCreate,
        _EXTRA_ACTION_BEFORE_UPDATE_: actionBeforeUpdate,
        _EXTRA_ACTION_AFTER_UPDATE_: '',
        _EXTRA_ACTION_BEFORE_REMOVE_: actionBeforeRemove,
        _SERVICE_ADD_REMOVE_CONNECT_: serviceAddRemoveConnect,
        _SERVICE_ADD_REMOVE_: serviceAddRemove,
    })
    result += ''
    return result
}

export const disconnectLinkedModels = (modelName, membersWithRelation: SchemaModelMember[], isItForRemove = false) => {
    let result = ''
    // const membersWithRelation = members.every(m => m.relation != null);

    for (const member of membersWithRelation) {
        const relation = member.relation
        const relatedModel = relation.relatedModel
        const relationModelName = relatedModel.modelName
        const relationName = relation.name
        const relatedMember = relatedModel.members.find((m) => m.relation && m.relation.name === relationName)
        const relatedMemberName = relatedMember.name

        const dataMemberName = `data.${member.name}`
        const lower = relationModelName.charAt(0).toLowerCase() + relationModelName.slice(1)
        let removeList

        result += ``

        // remove doesn't have any incoming data, should disconnect them automaticaly
        // but can happend some relations are already removed bacause is called from there
        // example: M2 have required relation to M1, M1 is removing and also call remove M2 object
        //          M2 will clean all its own relations, but cleaning relations to M1 is not necessay
        //          because M1 it will removed by itself anyway
        if (isItForRemove) {
            result += `if( !skipRelations.includes('${lower}') ){`
            removeList = `[...skipRelations, '${modelName}']`
        } else {
            removeList = `['${modelName}']`
            if (member.isArray) {
                result += `if( (data.${relation.payloadNameForId} && data.${relation.payloadNameForId}.length > 0) || (data.${relation.payloadNameForCreate} && data.${relation.payloadNameForCreate}.length > 0) ){`
            } else {
                result += `if( data.${relation.payloadNameForId} || data.${relation.payloadNameForCreate} ){`
            }
        }

        if (relatedMember.isArray) {
            // more about `$all` see https://stackoverflow.com/a/18149149
            result += `
      // relation is type: ${relation.type.toString()} 
      await entry.models['${lower}'].updateMany({${relatedMemberName}:{$all: [id]}}, {$pull: {${relatedMemberName}: id}})
    `
        } else if (relatedMember.isRequired) {
            result += `
      // relation is type: ${relation.type.toString()} and related model have it as required
      const relatedModels = await entry.models['${lower}'].find({${relatedMemberName}: id}, {_id:true})
      if(relatedModels && relatedModels.length > 0){
        // we call services because is necessary also unlink relations with removing object
        await Promise.all(relatedModels.map((relatedModel) => entry.services['${lower}'].remove(relatedModel._id, ctxUserId, ${removeList})))
      }
  `
        } else {
            result += `
      // relation is type: ${relation.type.toString()}
      await entry.models['${lower}'].updateMany({${relatedMemberName}: id}, {${relatedMemberName}: null})
  `
        }

        result += '}'
    }

    return result
}

export const updateLinkedModels = (membersWithRelation: SchemaModelMember[], currentIdName, create = false) => {
    let result = ''
    // const membersWithRelation = members.every(m => m.relation != null);

    for (const member of membersWithRelation) {
        const relationModelName = member.relation.relatedModel.modelName
        const relatedModel = member.relation.relatedModel
        const relationName = member.relation.name
        const relatedMember = relatedModel.members.find((m) => m.relation && m.relation.name === relationName)
        const relatedMemberName = relatedMember.name
        const varLinkedIds = `${member.name}LinkedIds`

        const lower = relationModelName.charAt(0).toLowerCase() + relationModelName.slice(1)

        result += `
    if(${varLinkedIds} && ${varLinkedIds}.length > 0) {`
        // TODO: test for relatedMember.relation.type generate correct `updateMany`
        // TODO: test for relatedMember.relation.type set right type corespond to member model
        if (relatedMember.isArray) {
            result += `
        await entry.models['${lower}'].updateMany({ _id: {$in: ${varLinkedIds}} }, {  $push: {${relatedMemberName}: { $each: [${currentIdName}]}} })
      `
        } else {
            result += `
      await entry.models['${lower}'].updateMany({ _id: {$in: ${varLinkedIds}} }, {  ${relatedMemberName}: ${currentIdName} })
    `
        }
        result += '}'
    }

    return result
}

export const conversionsIdsToField = (membersWithRelation: SchemaModelMember[], create = false) => {
    let result = ''
    // const membersWithRelation = members.every(m => m.relation != null);

    for (const member of membersWithRelation) {
        const isMeMany = member.isArray
        const relationModelName = member.relation.relatedModel.modelName
        const varLinkedIds = `${member.name}LinkedIds`
        const lower = relationModelName.charAt(0).toLowerCase() + relationModelName.slice(1)

        const relatedConnecteMember = member.relation.relatedModel.members.find((member) => member.relation && member.relation.name === member.relation.name)
        const isHeMany = relatedConnecteMember.isArray

        let swithcOfLInkedIds
        let switchOfAddConnectedId = ''
        if (create) {
            if (relatedConnecteMember.isRequired) {
                switchOfAddConnectedId = '// the related member is required so we need for creation a id (TEMPORARY-ID)\n\t\t'
                swithcOfLInkedIds = '// backward relation is setup just with TEMPORARY-ID so need update later with REAL-ID\n\t\t'
            } else {
                switchOfAddConnectedId = '// the related member is NOT required so we will update later with REAL-ID\n\t\t// '
                swithcOfLInkedIds = '// backward relation is not setup yet, so need update later with REAL-ID\n\t\t '
            }
        } else {
            swithcOfLInkedIds = '// backward relation is already setup, so no need any update aditional\n\t\t// '
        }

        let transformIds
        let objectCreate = ''
        const transformConfig = {
            _LOWER_NAME_: lower,
            _LINKDED_IDS_: varLinkedIds,
            _CONNECTED_MEMBER_NAME_: relatedConnecteMember.relation.payloadNameForId,
            _CONNECTED_MEMBER_ID_: isHeMany ? '[id]' : 'id',
            _MEMBER_NAME_: member.name,
            _SWITCH_OF_ADD_CONNECTED_ID_: switchOfAddConnectedId,
            _SWITCH_OF_ADD_TO_LINKED_IDS_: swithcOfLInkedIds,
            _PAYLOAD_NAME_FOR_ID_: member.relation.payloadNameForId,
            _PAYLOAD_NAME_FOR_CREATE_: member.relation.payloadNameForCreate,
        }

        if (isMeMany) {
            transformIds = templateFileToText('service-transform-many-ids.ts', transformConfig)
        } else {
            transformIds = templateFileToText('service-transform-one-id.ts', transformConfig)
            objectCreate = member.relation.payloadNameForCreate ? templateFileToText('service-create-one-object.t.ts', transformConfig) : ''
        }

        result += `
            const ${varLinkedIds} = []
            ${objectCreate}
            ${transformIds}
            
      `
    }

    return result
}

function createEntityService(model: SchemaModel) {
    const result = templateFileToText('entity.service.t.ts', {
        __ENTITY_NAME__: model.modelName,
    })

    return result
}

export const generateServiceToFile = (backendDirectory: BackendDirectory, model: SchemaModel) => {
    const str = model.type === SchemaModelType.MODEL ? createService(model) : createEntityService(model)

    backendDirectory.servicesWrite(`${model.modelName}`, str)
}

export const generateServices = (backendDirectory: BackendDirectory, models: SchemaModel[]) => {
    log.trace('generateServices')
    for (const model of models) {
        log.info(`Generate service for model: ${model.modelName}`)
        generateServiceToFile(backendDirectory, model)
    }
}
