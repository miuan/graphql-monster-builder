import { SchemaModelRelationType, SchemaModel } from '../common/types';

export const setupModelsRelations = (models: SchemaModel[]) => {

  for (const model of models) {
    for (const member of model.members) {
      if (member.relation && !member.relation.type) {
        const relationName = member.relation.name;
        const another = searchModelsRelationsInModels(relationName, models, [model.modelName]);
        if (!another) {
          member.relation.error = `Unknow relation to '${relationName}'`;
          continue;
        }

        const anotherMember = another.member; 
        // console.log(relationName, models);
        const exc = [model.modelName, anotherMember.name];
        const anotherThird = searchModelsRelationsInModels(relationName, models, exc);
        if (!anotherThird) {
          member.relation.error = `To many relation to '${relationName}'`;
          continue;
        }

        const ATM = anotherMember.type.indexOf('[') === 0;
        const CTM = member.type.indexOf('[') === 0;

        if (ATM && CTM) {
          member.relation.type = SchemaModelRelationType.MANY_TO_MANY;
          anotherMember.relation.type = SchemaModelRelationType.MANY_TO_MANY;
        } else if (!ATM && !CTM) {
          member.relation.type = SchemaModelRelationType.ONE_TO_ONE;
          anotherMember.relation.type = SchemaModelRelationType.ONE_TO_ONE;
        } else if (ATM && !CTM) {
          // me is one and another is multi
          member.relation.type = SchemaModelRelationType.ONE_TO_MANY;
          anotherMember.relation.type = SchemaModelRelationType.MANY_TO_ONE;
        } else if (!ATM && CTM) {
          // me is multi and another is one
          member.relation.type = SchemaModelRelationType.MANY_TO_ONE;
          anotherMember.relation.type = SchemaModelRelationType.ONE_TO_MANY;
        }

        generateInputNameAndFindRelatedModel(models, { model, member });
        generateInputNameAndFindRelatedModel(models, another);
      }
    }
  }
};

export const generateInputNameAndFindRelatedModel = (models, { model, member }) => {
  const NO_CREATE_FROM_ANOTHER_MODEL = [
    'User',
    'File',
  ];

  const modelName = extendModelNameFromType(member.type);
  
  member.relation.inputName = model.modelName + member.name + modelName;
  // find model what is related to member.type
  member.relation.relatedModel = models.find(m => (m.modelName === modelName));

  if (!member.relation.relatedModel) {
    throw `Model name '${modelName}'\
mention in relation '${member.relation.name}'\
in member ${member.name} doesn't exist`;
  }

  const noCreateFromAnother = NO_CREATE_FROM_ANOTHER_MODEL.some(m => m === modelName);
  member.relation.createFromAnotherModel = !noCreateFromAnother;
};

export const searchModelsRelationsInModels = (relationName: string, models: SchemaModel[], exc: string[]) => {
  for (const model of models) {
    if (exc.indexOf(model.modelName) === -1) {
      for (const member of model.members) {
        if (member.relation && member.relation.name === relationName) {
          return { model, member };
        }
      }
    }
  }

  return null;
};

export const extendModelNameFromType = (memberType: string) => {
  return memberType.replace('[', '').replace(']', '').replace('!', '').replace('!', '');
};
