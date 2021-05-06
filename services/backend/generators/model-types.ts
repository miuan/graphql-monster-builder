import {
  SchemaModel,
  SchemaModelMember,
} from '../../common/types';


const defaultMembers = [
  'createdAt',
  'updatedAt',
  'id',
];

import logger from '../../log'
import { types } from 'util';
import { BackendDirectory } from '../backendDirectory';
const log = logger.getLogger('types')

export const createModelTypeFromModel = (model : SchemaModel) => {
  const {modelName} = model
  let modelMembers = ''

  for (const member of model.members) {
    modelMembers += `\n\t\t${member.name}: ${transformMemberTypeToTypescriptType(member)}`
  }

  return `
    // type for model: \`${modelName}\`
    export interface ${modelName}Model extends Document {${modelMembers}
    }
  `
}
  
export const transformMemberTypeToTypescriptType = (member : SchemaModelMember) => {
  let ttype

  if (member.relation) {
     ttype = `${member.relation.relatedModel.modelName}Model`;
  } else if (member.type === 'DateTime') {
    ttype = 'Date';
  } else if (member.type === 'Int') {
    ttype =`Number`;
  } else if (member.type === 'ID') {
    ttype =`String`;
  } else {
    ttype = `${member.type}`;
  }

  if(member.isArray){
    ttype+='[]'
  }

  return ttype
};

export const generateModelTypes = (backendDirectory: BackendDirectory, models: SchemaModel[]) => {
  log.trace('generateTypescriptTypes')
  let typesAll = `import { Document } from 'mongoose'\n`
  for (const model of models) {
    typesAll += createModelTypeFromModel(model);
  }
  log.info(`Generate types for all models: types.ts`)
  backendDirectory.genWrite(`model-types.ts`, typesAll);
};
