
import {
  schemaMutations,
  notMutationFields,
  schemaFilterStringValue,
  schemaFilterNumberValue,
} from '../../common/constatns';

import {
  Structure,
  SchemaModel,
  SchemaModelRelationType,
  SchemaModelMember,
} from '../../common/types';
import { writeToFile } from '../../common/files';
import { searchModelsRelationsInModels, getOnlyOneRelatedMember } from '../../common/utils';

let applayedRelations = [];

export const generateSchemaQueries = (models: SchemaModel[]) => {
  
  let result = `type Query {\n`;

  for (const model of models) {
    const name = model.modelName;
    // tslint:disable-next-line:max-line-length
    result += `  all${name}s(filter: ${name}Filter, orderBy: ${name}OrderBy, skip: Int, first: Int, last: Int): [${name}!]!\n`;
  }

  for (const model of models) {
    result += `  ${model.modelName}(id: ID): ${model.modelName}\n`;
  }

  result += `   login(email: String!, password: String!): User\n`;

  result += '}\n\n';

  return result;
};



export const cleanApplayedRelations = () => {
  applayedRelations = [];
};
export const relatedParamName1 = (model: SchemaModel, relatedMember: SchemaModelMember) => `${relatedMember.name}${model.modelName}`
export const relatedParamName2 = (member: SchemaModelMember) => `${member.name}${member.relation.relatedModel.modelName}`
export const relatedParamName1Id = (model: SchemaModel, relatedMember: SchemaModelMember) => `${relatedParamName1(model, relatedMember)}Id`
export const relatedParamName2Id = (member: SchemaModelMember) => `${relatedParamName2(member)}Id`


export const generateMutationAddingsAndRemovings = (model: SchemaModel) => {
  let result = '';
  for (const member of model.members) {
    if (!member.relation) {
      continue;
    } else if (member.relation.type === SchemaModelRelationType.ONE_TO_MANY || 
      member.relation.type === SchemaModelRelationType.MANY_TO_MANY) {
      const relation = member.relation;
      const relationName = relation.name;
      
      const relatedMember = getOnlyOneRelatedMember(member)
      if(!relatedMember) {
        continue
      }

      console.log('winner is:', model.modelName)

      const relatedModel = relation.relatedModel;
      // const relatedMember = relatedModel.members.find(m => m.relation && m.relation.name === relationName);

      let params = `${relatedParamName1Id(model, relatedMember)}: ID!, ${relatedParamName2Id(member)}: ID!`;

      result += `addTo${relationName}(${params}): AddTo${relation.payloadNameForAddOrDelete}\n`;
      result += `removeFrom${relationName}(${params}): RemoveFrom${relation.payloadNameForAddOrDelete}\n`;
      applayedRelations.push(relationName);
    }
    
  }

  return result;
};

export const genereateSchemaPayloads = (models: SchemaModel[]) => {
  let result = '';

  for (const model of models) {
    result += genereateSchemaModelPayloads(model);
  }
  // result += genereateSchemaModelPayloads(models[3]);
  // result += genereateSchemaModelPayloads(models[4]);

  return result;
};

export const genereateSchemaModelPayloads = (model: SchemaModel) => {
  let result = '';

  for (const member of model.members) {
    const relation = member.relation;
    if (relation && !relation.payloadNameForAddOrDelete) { 
      const relationName = relation.name;
      const payloadName = `${relationName}Payload`;
      const relatedModel = relation.relatedModel;
      const relatedMember = relatedModel.members.find(m => m.relation && m.relation.name === relationName);

      const bodyMember1 = `${relatedParamName1(model, relatedMember)}: ${relatedMember.modelName}`;
      const bodyMember2 = `${relatedParamName2(member)}: ${member.modelName}`;

      relation.payloadNameForAddOrDelete = payloadName;
      relatedMember.relation.payloadNameForAddOrDelete = payloadName;

      result += `# on model ${model.modelName} - ${member.name}\n`;
      result += 
`type AddTo${payloadName} {
  ${bodyMember1}
  ${bodyMember2}
}\n
`;

      result += 
`type RemoveFrom${payloadName} {
  ${bodyMember1}
  ${bodyMember2}
}
`;

    }
  }

  return result;
};

// export const findRelatedMemberInRelatedModel = (relation: SchemaModelRelation) => {
//   const relationName = relation.name;
// relation.relatedModel.members.some(mirm => mirm.relation && mirm.relation.name === relationName);
  
//   for (const memberInRelationModel of relation.relatedModel.members) {
    
//   }
// };

export const generateSchemaMutations = (models: SchemaModel[]) => {
  
  let result = `type Mutation {\n`;

  applayedRelations = [];
  for (const model of models) {
    for (const mutation of schemaMutations) {
      const name = model.modelName;
      const mutationName = mutation[0];
      const mutationParams = mutation[1];
      
      if (mutationParams === 'ONLY_ID') {
        result += `  ${mutationName}${name}(id: ID!): ${name}\n`;
      } else {
        const params = generateInputParamsForMutationModel(model, {
          includeId: mutationParams === 'ALWAYS_ID',
          forceRequiredFields: mutationName === 'create',
        });
        result += `  ${mutationName}${name}(${params}): ${name}\n`;
      }
    }
    result += generateMutationAddingsAndRemovings(model);
  }

  result += `   refreshToken(userId: ID!, refreshToken: String!): User\n`;
  result += `   changePassword(userId: ID!, oldPassword: String!, newPassword: String!): User\n`;
  result += `   forgotPassword(email: String!): String\n`;
  result += `   resetPassword(token: String!, password: String): User\n`;
  
  result += '}\n\n';

  return result;
};

export const generateInputParamsForMutationModel = (model: SchemaModel, options: any = null) => {
  let result = '';
  const nmf = [...notMutationFields['']];

  const includeId = options && options.includeId; 
  const excludeRelationToModel = options && options.excludeRelationToModel;
  const forceRequiredFields = options && options.forceRequiredFields;

  if (notMutationFields[model.modelName] && notMutationFields[model.modelName].length > 0) {
    nmf.push(...notMutationFields[model.modelName]);
  }

  if (includeId) {
    result += `, id: ID!`;
  }

  for (const member of model.members) {
    const mame = member.name;
    if (nmf.indexOf(mame) === -1) {

      if (member.relation) {
        if (excludeRelationToModel === member.modelName) {
          // this relation is excluded
          // please don't consider to do any action
          continue;
        }

        const relationType = member.relation.type;
        const relatedModel = member.relation.inputName;
        const createFromAnotherModel = member.relation.createFromAnotherModel;

        const relationIsArray = (
          relationType === SchemaModelRelationType.ONE_TO_MANY ||
          relationType === SchemaModelRelationType.ONE_TO_ONE
        );
        

        const relationTemplate =  relationIsArray ? ', _NAME_Id: ID' : ', _NAME_Ids: [ID!]';
        
        let relationText = relationTemplate.replace('_NAME_', mame);

        if (createFromAnotherModel) {
          const relationTemplate2 = relationIsArray ? ', _NAME_: _TYPE_' : ', _NAME_s: [_TYPE_!]';
          relationText += relationTemplate2.replace('_NAME_', mame).replace('_TYPE_',relatedModel);
        }
        
        // imagess -> images
        if (mame.endsWith('s')) {
          relationText = relationText.replace(mame + 's', mame);
        }

        result += relationText;
      } else {
        result += `, ${mame}: ${member.type}`;

        if (forceRequiredFields && member.isRequired) {
          result += `!`;
        }
      }
        
      
    } 
  }
  return result.substr(2);
};


export const generateSchemaOrder = (model: SchemaModel) => {
  let result = `enum ${model.modelName}OrderBy {\n`;

  for (const member of model.members) {
    result += `  ${member.name}_ASC\n`;
    result += `  ${member.name}_DESC\n`;
  }

  result += '}\n\n';

  return result;
};

export const generateSchameFilter = (model: SchemaModel) => {
  const filterName = `${model.modelName}Filter`;
  let result = `input ${filterName} {\n
  AND: [${filterName}!]
  OR: [${filterName}!]
  `;

  for (const member of model.members) {
    
    // in case the member is related to another member
    if (member.relation) {
      result += `  ${member.name}_every: ${member.relation.relatedModel.modelName}Filter\n`;
      result += `  ${member.name}_some: ${member.relation.relatedModel.modelName}Filter\n`;
      result += `  ${member.name}_none: ${member.relation.relatedModel.modelName}Filter\n\n`;
      
      continue;
    }

    result += `  ${member.name}: ${member.type}\n`;
    const variants = member.type === 'String' ? schemaFilterStringValue : schemaFilterNumberValue;
    
    
    for (const v of variants) {
      const variable = v.length && v.length > 0 ? v[0] : v;
      const comment = v.length && v.length > 1 ? v[1] : '';
      const special = v.length && v.length > 2 ? v[2] : false;

      if (comment) {
        result += `  # ${comment}\n`;
      }
      
      
      if (!special) {
        result += `  ${member.name}_${variable}: ${member.type}\n\n`;
      } else {
        result += `  ${member.name}_${variable}: [${member.type}!]\n\n`;
      }
      
    }


  }

  result += '}\n\n';

  return result;
};

export const generateSchemaModel = (model: SchemaModel) => {
  let result = `type ${model.modelName} implements Node {\n`;
  
  for (const member of model.members) {
    result += `  ${member.name}: ${member.type}`;
    if (member.isRequired) {
      result += '!';
    }
    result += '\n';
  }

  result += '}\n';

  return result;
};

export const generateSchemaInputs = (models: SchemaModel[]) => {
  let result = ``;
  

  for (const model of models) {
    for (const member of model.members) {
      if (member.relation && member.relation.createFromAnotherModel) {
        result += generateSchemaInputsForModel(
          model.modelName,
          member.relation.relatedModel, 
          member.relation.inputName);
      }
    }
  }

  result += '\n';
  return result;
};

export const generateSchemaInputsForModel = (modelName: string, relatedModel: SchemaModel, inputName: string) => {
  let result = `input ${inputName} {\n`;

  
  result += generateInputParamsForMutationModel(relatedModel, { 
    includeID: false,
    excludeRelationToModel: modelName,
    forceRequiredFields: true,
  });

  result += '\n}\n';

  return result;
};


export const generateSchemaAsString = (models: SchemaModel[]):string => {
  let result = '';

  for (const model of models) {
    result += generateSchemaOrder(model);
  }

  for (const model of models) {
    result += generateSchameFilter(model);
  }

  result += `# An object with an ID
interface Node {
  # The id of the object.
  id: ID!
}

scalar DateTime
  `;
  for (const model of models) {
    result += generateSchemaModel(model);
  }

  result += generateSchemaQueries(models);
  result += generateSchemaInputs(models);
  result += genereateSchemaPayloads(models);
  result += generateSchemaMutations(models);
  return result;
};

export const generateSchema = async (structure: Structure, models: SchemaModel[]) => {
  const body = generateSchemaAsString(models);
  writeToFile(structure.gen, `graphql.schema`, body);
};
