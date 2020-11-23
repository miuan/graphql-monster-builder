import {
  SchemaModel,
  SchemaModelRelationType,
  Structure,
  SchemaModelMember,
} from '../../services/common/types';

import {
  writeToFile,
} from '../../services/common/files';

const defaultMembers = [
  'createdAt',
  'updatedAt',
  'id',
];

import logger from '../../services/log'
const log = logger.getLogger('model')

export const createMongoModel = (structure: Structure, model : SchemaModel) => {
  const modelName = model.modelName;
  const lower = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const varName =  lower + 'Schema';
  let result = `import { Document, Schema, Model, model } from 'mongoose';
  
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

export const ${lower}Model: Model<Document> = model<Document>('${structure.id}_${modelName}', ${varName});`;
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

export const generateMongoModelToFile = (structure: Structure, model: SchemaModel) => {
  const str = createMongoModel(structure, model);

  writeToFile(structure.models, `${model.modelName}`, str);
};


export const generateModels = (structure: Structure, models: SchemaModel[]) => {
  log.trace('generateModels')
  for (const model of models) {
    log.info(`Generate model: ${model.modelName}`)
    generateMongoModelToFile(structure, model);
  }
};
