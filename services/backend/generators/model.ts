import {
  SchemaModel,
  SchemaModelRelationType,
  Structure,
  SchemaModelMember,
} from '../../common/types';

import {
  writeToFile,
} from '../../common/files';

const defaultMembers = [
  'createdAt',
  'updatedAt',
  'id',
];

import logger from '../../log'
import { BackendDirectory } from '../backendDirectory';
const log = logger.getLogger('model')

export const createMongoModel = (structure: Structure, model : SchemaModel) => {
  const modelName = model.modelName;
  const lower = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const varName =  lower + 'Schema';
  let result = `import { Schema, Model, model } from 'mongoose'
  import { ${modelName}Model } from '../model-types'
  
const ${varName}: Schema = new Schema(
{
`;

  for (const member of model.members) {
    if (defaultMembers.indexOf(member.name) !== -1) {
      continue;
    }

    result += `\t\t${member.name}:`;
    
    let params = `{ type: Schema.Types.${transformTypeToMongoType(structure, member)}`;

    if (member.isRequired) {
      params += `, required: true`;
    }

    if (member.isUnique) {
      params += `, unique: true`;
    }
    params += ' }';

    if (member.isArray) {
      result += ` [${params}],\n`;
    } else {
      result += ` ${params},\n`;
    }
    
  }

  if (modelName === 'User') {
    result += `_password: { type: Schema.Types.String, required: true},\n`;
    result += `_reset_password_token: { type: Schema.Types.String},\n`;
  }

  result += 
`},
{
  timestamps: true,
  usePushEach: true,
  versionKey: false,
});

${varName}.pre('find', function() {
  this._startTime = Date.now();
});

${varName}.post('find', function() {
  if (this._startTime != null) {
    // console.log('Runtime in MS: ', Date.now() - this._startTime);
  }
})

${varName}.pre('findOne', function() {
  this._startTime = Date.now();
});

${varName}.post('findOne', function() {
  if (this._startTime != null) {
    // console.log('Runtime in MS: ', Date.now() - this._startTime);
  }
})

${varName}.pre('update', function() {
  this._startTime = Date.now();
});

${varName}.post('update', function() {
  if (this._startTime != null) {
    // console.log('Runtime in MS: ', Date.now() - this._startTime);
  }
})

export const ${lower}Model: Model<${modelName}Model> = model<${modelName}Model>('${structure.id}_${modelName}', ${varName});`;
  return result;
};

export const transformTypeToMongoType = (structure: Structure, member : SchemaModelMember) => {
  
  if (member.relation) {
    let result = 'ObjectId, ';
    result += `ref: '${structure.id}_${member.relation.relatedModel.modelName}', index: true`;
    return result;
  } 
  
  if (member.type === 'DateTime') {
    return 'Date';
  } else if (member.type === 'Int') {
    return `Number`;
  } else {
    return `${member.type}`;
  }
};

export const generateMongoModelToFile = (backendDirectory: BackendDirectory, model: SchemaModel) => {
  const str = createMongoModel(backendDirectory.structure, model);

  backendDirectory.modelsWrite(`${model.modelName}`, str);
};


export const generateModels = (backendDirectory: BackendDirectory, models: SchemaModel[]) => {
  log.trace('generateModels')
  for (const model of models) {
    log.info(`Generate model: ${model.modelName}`)
    generateMongoModelToFile(backendDirectory, model);
  }
};
