import { SchemaModel, SchemaModelRelationType, SchemaModelMember } from './types'
import logger from '../log'
const log = logger.getLogger('utils')

export const searchModelsRelationsInModels = (relationName: string, models: SchemaModel[], exclude: string[] = []) => {
    for (const model of models) {
        if (exclude.indexOf(model.modelName) === -1) {
            for (const member of model.members) {
                if (member.relation && member.relation.name === relationName) {
                    return { model, member }
                }
            }
        }
    }

    return null
}

// in many to many relation we need create only one add or delete methods
// for example User and UserRole we want only userAddToUserRole and userRemoveFromUserRole
// but because the relation is cross each others it will create also userRoleAddToUser and userRoleRemoveFromUser
export const getOnlyOneRelatedMember = (member: SchemaModelMember) => {
    const {
        relation,
        relation: { name: relationName, relatedModel },
    } = member

    const { model: _, member: relatedMember } = searchModelsRelationsInModels(relationName, [relatedModel])
    log.trace('relationName, member.name ' + relationName, member.modelName, relatedMember.modelName)

    if (member.isArray && relatedMember.isArray) {
        // in split select member alfabethicaly higher
        return member.modelName < relatedMember.modelName ? relatedMember : member
    } else if (member.isArray) {
        return member
    } else if (relatedMember.isArray) {
        return relatedMember
    }

    // if any of them is not array, not take any
    return
}

export const firstToLower = (name) => name.charAt(0).toLowerCase() + name.slice(1)
