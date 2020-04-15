import { SchemaModel, SchemaModelRelationType, SchemaModelMember } from "./types";

export const searchModelsRelationsInModels = (relationName: string, models: SchemaModel[], exclude: string[] = []) => {
    for (const model of models) {
      if (exclude.indexOf(model.modelName) === -1) {
        for (const member of model.members) {
          if (member.relation && member.relation.name === relationName) {
            return { model, member };
          }
        }
      }
    }
  
    return null;
  };

  // in many to many relation we need create only one add or delete methods
  // for example User and UserRole we want only userAddToUserRole and userRemoveFromUserRole
  // but because the relation is cross each others it will create also userRoleAddToUser and userRoleRemoveFromUser
  // be aware  SchemaModelRelationType.ONE_TO_MANY don't have cross relations 
  // and need to be create one add and delete methods too
  export const getOnlyOneRelatedMember = (member: SchemaModelMember) => {
    const relation = member.relation
    const relationName = relation.name;

    const {model:_, member: relatedMember} = searchModelsRelationsInModels(relationName, [relation.relatedModel])
    console.log('relationName, member.name '+relationName, member.modelName, relatedMember.modelName)

    // relation is created in relation what 
    // member is alfabethicaly higher
    if (member.relation.type !== SchemaModelRelationType.ONE_TO_MANY && member.modelName < relatedMember.modelName) {
      return
    }

    return relatedMember
  }


  export const firstToLower = (name) => name.charAt(0).toLowerCase() + name.slice(1)