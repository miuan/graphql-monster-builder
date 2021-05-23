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
import { BackendDirectory } from '../backendDirectory';
const log = logger.getLogger('types')

export const createModelTypeFromModel = (model : SchemaModel) => {
  const {modelName} = model
  let modelMembers = ''

  for (const member of model.members) {
    modelMembers += `\n\t\t${member.name}: ${transformMemberTypeToTypescriptType(member)}`
  }

  if (modelName === 'User') {
    modelMembers += `\n\t\t__token?: string,\n`
    modelMembers += `\n\t\t__refreshToken?: string,\n`
    modelMembers += `\n\t\t__verifyToken?: string,\n`
    modelMembers += `\n\t\t__password: string,\n`
    modelMembers += `\n\t\t__resetPasswordToken: string,\n`
    modelMembers += `\n\t\t__parent_access_token: string,\n`
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
  } else if (member.type === 'Int' || member.type === 'Float') {
    ttype =`number`;
  } else if (member.type === 'ID' || member.type === 'String') {
    ttype =`string`;
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
