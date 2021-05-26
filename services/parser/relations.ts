import { SchemaModelRelationType, SchemaModel } from '../common/types';
import * as _ from 'lodash'

export const setupModelsRelations = (models: SchemaModel[]) => {

  for (const model of models) {
    for (const member of model.members) {
      if (member.relation && !member.relation.type) {
        const relationName = member.relation.name;
        const relatedModel = searchModelsRelationsInModels(relationName, models, [model.modelName]);
        if (!relatedModel) {
          member.relation.error = `Unknow relation to '${relationName}'`;
          throw new Error(`Line: ${member.row} Relation '${relationName}' doesn't have mate`)
        }

        const relatedMember = relatedModel.member; 
        // console.log(relationName, models);
        const exc = [model.modelName, relatedMember.name];
        const anotherThird = searchModelsRelationsInModels(relationName, models, exc);
        if (!anotherThird) {
          member.relation.error = `To many relation to '${relationName}'`;
          throw new Error(`Line: ${member.row} To many relation to '${relationName}`)
          continue;
        }

        const relatedIsArray = relatedMember.isArray;
        const meIsArray = member.isArray;

        if (relatedIsArray && meIsArray) {
          member.relation.type = SchemaModelRelationType.MANY_TO_MANY;
          relatedMember.relation.type = SchemaModelRelationType.MANY_TO_MANY;
        } else if (!relatedIsArray && !meIsArray) {
          member.relation.type = SchemaModelRelationType.ONE_TO_ONE;
          relatedMember.relation.type = SchemaModelRelationType.ONE_TO_ONE;
        } else if (relatedIsArray && !meIsArray) {
          // me is one and another is multi
          member.relation.type = SchemaModelRelationType.ONE_TO_MANY;
          relatedMember.relation.type = SchemaModelRelationType.MANY_TO_ONE;
        } else if (!relatedIsArray && meIsArray) {
          // me is multi and another is one
          member.relation.type = SchemaModelRelationType.MANY_TO_ONE;
          relatedMember.relation.type = SchemaModelRelationType.ONE_TO_MANY;
        }

        generateInputNameAndFindRelatedModel(models, { model, member });
        generateInputNameAndFindRelatedModel(models, relatedModel);

        if (member.isRequired && member.isArray && member.relation) {
          member.relation.error = `Line ${member.row}: Array field '${member.name}' with relation to ${member.relation.relatedModel.modelName} (as many) can't be required! Only required relations to ONE are supported`
          member.isRequired = false
        }
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
  
  member.relation.inputName = `In${model.modelName}Member${_.upperFirst(member.name)}As${modelName}`;
  // find model what is related to member.type
  member.relation.relatedModel = models.find(m => (m.modelName === modelName));

  if (!member.relation.relatedModel) {
    throw `Line ${member.row}: Model name '${modelName}'\
mention in relation '${member.relation.name}'\
in member ${member.name} doesn't exist`;
  }

  // Check if relation type have a member to connect back to model
  const relatedMember = member.relation.relatedModel.members.find(m => m.relation && m.relation.name === member.relation.name);
  if (!relatedMember) {
    throw `Line ${member.row}: Model '${member.relation.relatedModel.modelName}'\ (start at line: ${member.relation.relatedModel.start}) doesn't have any member what have relation with name: '${member.relation.name}'`;
  }

  const noCreateFromAnother = NO_CREATE_FROM_ANOTHER_MODEL.some(m => m === modelName);
  member.relation.createFromAnotherModel = !noCreateFromAnother;

  member.relation.relatedMember = relatedMember
  // NOTE:  note use just member name
  //        change todo -> todos for create list can be problem if user will have two array fileds 'todo' and 'todos'
  //        todo will transform to todos and will be there two same input parameters... 
  //        member.relation.payloadNameForCreate = member.isArray && !member.name.endsWith('s')? `${member.name}s` : member.name
  member.relation.payloadNameForCreate = member.name
  member.relation.payloadNameForId = member.isArray ? `${member.name}Ids` : `${member.name}Id`
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
