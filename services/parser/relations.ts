import { SchemaModel, SchemaModelMember, SchemaModelRelationLinkNames, SchemaModelRelationType } from '../common/types'
import { firstToLower, firstToUpper, getOnlyOneRelatedMember } from '../common/utils'

export const setupModelsRelations = (models: SchemaModel[]) => {
    for (const model of models) {
        for (const member of model.members) {
            if (member.relation) {
                if (!member.relation.relatedModel) {
                    if (member.relation.type === SchemaModelRelationType.RELATION) {
                        processRelation(models, model, member, member.relation.name)
                    } else processEntity(models, model, member)
                }
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
    member.relation.inputName = `In${member.modelName}Member${firstToUpper(member.name)}As${relatedModel.modelName}`
}

function processRelation(models: SchemaModel[], model: SchemaModel, member: SchemaModelMember, relationName: string) {
    const foundRelations = searchRelatedModelAndMember(models, model.modelName, relationName)
    if (foundRelations.length < 2) {
        member.relation.error = `Unknow relation to '${relationName}'`
        throw new Error(`Line: ${member.row} Relation '${relationName}' doesn't have mate. Relation have to be a connection between two models`)
    } else if (foundRelations.length > 2) {
        const lines = foundRelations.reduce((a, c) => (a += `, ${c.relatedMember.row}`), '').substr(2)
        member.relation.error = `To many relation to '${relationName}'`
        throw new Error(`Line: ${member.row} To many relation with name '${relationName}' on lines: ${lines} expecting only two mates`)
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
    setupRelation(member, relatedModel, relatedMember, model.modelName)
    setupRelation(relatedMember, model, member, relatedModel.modelName)

    member.relation.linkNames = setupRelationLinkNames(member)
}

export function setupRelation(member, relatedModel, relatedMember, modelName) {
    const NO_CREATE_FROM_ANOTHER_MODEL = ['User', 'File']

    member.modelName = relatedModel.modelName
    member.relation.relatedModel = relatedModel
    member.relation.relatedMember = relatedMember
    member.relation.inputName = `In${modelName}Member${firstToUpper(member.name)}As${relatedModel.modelName}`

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

export function setupRelationLinkNames(member: SchemaModelMember): SchemaModelRelationLinkNames {
    const relation = member.relation
    const isSystem = member.relation.name[0] === '_'

    const relationName = isSystem ? relation.name.substr(1) : firstToUpper(relation.name)
    const linkName = isSystem ? `add${relationName}` : `link${relationName}`
    const unlinkName = isSystem ? `remove${relationName.replace(/To/, 'From')}` : `unlink${relationName.replace(/To/, 'From')}`

    const res1 = firstToLower(relation.relatedMember.relation.relatedModel.modelName)
    const res2 = firstToLower(relation.relatedModel.modelName)
    const param1 = `${res1}Id`
    const param2 = `${res2}Id`

    return {
        isSystem,
        relationName,
        linkName,
        unlinkName,
        res1,
        res2,
        param1,
        param2,
    } as SchemaModelRelationLinkNames
}
