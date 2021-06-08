import { SchemaModelRelationType, SchemaModel, SchemaModelMember } from '../common/types'
import * as _ from 'lodash'
import { isEnumMember } from 'typescript'

export const setupModelsRelations = (models: SchemaModel[]) => {
    for (const model of models) {
        for (const member of model.members) {
            if (member.relation && !member.relation.relatedModel) {
                if (member.relation.type == SchemaModelRelationType.ENTITY) processEntity(models, model, member)
                else processRelation(models, model, member, member.relation.name)
            }
        }
    }
}

function processEntity(models: SchemaModel[], model: SchemaModel, member: SchemaModelMember) {
    const relatedModel = models.find((searchModel) => searchModel.modelName == member.modelName)
    if (!relatedModel) {
        throw new Error(`Line: ${member.row} Type, Entity or Model with name '${member.modelName}' not found.`)
    }
    member.relation.relatedModel = relatedModel
    member.relation.relatedMember = null
    member.relation.createFromAnotherModel = true
    member.relation.payloadNameForCreate = member.name
    member.relation.payloadNameForId = null
}

function processRelation(models: SchemaModel[], model: SchemaModel, member: SchemaModelMember, relationName: string) {
    const foundRelations = searchRelatedModelAndMember(models, model.modelName, relationName)
    if (foundRelations.length < 2) {
        member.relation.error = `Unknow relation to '${relationName}'`
        throw new Error(
            `Line: ${member.row} Relation '${relationName}' doesn't have mate. Relation have to be a connection between two models`,
        )
    } else if (foundRelations.length > 2) {
        const lines = foundRelations.reduce((a, c) => (a += `, ${c.relatedMember.row}`), '').substr(2)
        member.relation.error = `To many relation to '${relationName}'`
        throw new Error(
            `Line: ${member.row} To many relation with name '${relationName}' on lines: ${lines} expecting only two mates`,
        )
    }

    // we expectiong on index 0 is current `model` and `member`
    // so second place is relation we looking for
    const { relatedModel, relatedMember } = foundRelations[1]

    if (relatedModel == model) {
        member.relation.error = `Recursive relation '${relationName}'`
        throw new Error(
            `Line: ${member.row} Relation with name '${relationName}' have recursion to the same model '${model.modelName}' on line: ${relatedMember.row}. Relation have to be a connection between two models`,
        )
    }

    // take modelName from each others
    setupRelation(member, relatedModel, relatedMember)
    setupRelation(relatedMember, model, member)
}

export function setupRelation(member, relatedModel, relatedMember) {
    const NO_CREATE_FROM_ANOTHER_MODEL = ['User', 'File']

    member.modelName = relatedModel.modelName
    member.relation.relatedModel = relatedModel
    member.relation.relatedMember = relatedMember
    member.relation.inputName = `${member.name}With${member.modelName}Input`

    member.relation.createFromAnotherModel = !NO_CREATE_FROM_ANOTHER_MODEL.includes(relatedModel.modelName)

    // NOTE:  note use just member name
    //        change todo -> todos for create list can be problem if user will have two array fileds 'todo' and 'todos'
    //        todo will transform to todos and will be there two same input parameters...
    //        member.relation.payloadNameForCreate = member.isArray && !member.name.endsWith('s')? `${member.name}s` : member.name
    member.relation.payloadNameForCreate = member.name
    member.relation.payloadNameForId = member.isArray ? `${member.name}Ids` : `${member.name}Id`

    if (member.isRequired && member.isArray) {
        member.relation.error = `Line ${member.row}: Relation array field '${member.name}' with name '${member.relation.name}' can't be required! Only required relations to ONE are supported`
        member.isRequired = false
    }
}

export function searchRelatedModelAndMember(models: SchemaModel[], currentModel: string, relationName: string) {
    let relations = null
    for (const model of models /*.filter((m) => m.modelName !== currentModel)*/) {
        const relatedMembers = model.members.filter((member) => member.relation && member.relation.name == relationName)
        if (relatedMembers.length > 0) {
            const remaped = relatedMembers.map((member) => ({ relatedModel: model, relatedMember: member }))
            if (!relations) relations = remaped
            else relations.push(...remaped)
        }
    }

    return relations
}

export const extendModelNameFromType = (memberType: string) => {
    return memberType.replace('[', '').replace(']', '').replace('!', '').replace('!', '')
}
