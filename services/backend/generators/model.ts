import {
  SchemaModel,
  SchemaModelRelationType,
  StructureBackend,
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

export const createMongoModel = (structure: StructureBackend, model : SchemaModel) => {
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
    
    let params = `{ type: ${transformTypeToMongoType(structure, member)}`;

    if (member.isRequired) {
      params += `, required: true`;
    }

    if (member.isUnique === true) {
      params += `, unique: true`;
    }

    if (member.default) {
      params += `, default: '${member.default}'`;
    }

    params += ' }';

    if (member.isArray) {
      result += ` [${params}],\n`;
    } else {
      result += ` ${params},\n`;
    }
    
  }

  if (modelName === 'User') {
    result += `__token: { type: Schema.Types.String, required: false},\n`
    result += `__refreshToken: { type: Schema.Types.String, required: false},\n`
    result += `__verifyToken: { type: Schema.Types.String, required: false},\n`
    result += `__password: { type: Schema.Types.String, required: true},\n`
    result += `__resetPasswordToken: { type: Schema.Types.String},\n`
    result += `__parent_access_token: { type: Schema.Types.String},\n`
  }

  result += 
`},
{
  timestamps: true,
  usePushEach: true,
  versionKey: false,
});

${varName}.pre('find', function() {
  (<any>this)._startTime = Date.now();
});

${varName}.post('find', function() {
  if ((<any>this)._startTime != null) {
    // console.log('Runtime in MS: ', Date.now() - (<any>this)._startTime);
  }
})

${varName}.pre('findOne', function() {
  (<any>this)._startTime = Date.now();
});

${varName}.post('findOne', function() {
  if ((<any>this)._startTime != null) {
    // console.log('Runtime in MS: ', Date.now() - (<any>this)._startTime);
  }
})

${varName}.pre('update', function() {
  (<any>this)._startTime = Date.now();
});

${varName}.post('update', function() {
  if ((<any>this)._startTime != null) {
    // console.log('Runtime in MS: ', Date.now() - (<any>this)._startTime);
  }
})
`

if(modelName === 'User'){
  // https://docs.mongodb.com/manual/core/index-partial/#examples
  result += `
  ${varName}.index(
    { __resetPasswordToken: 1 },
    { unique: true, partialFilterExpression: { __resetPasswordToken: { $exists: true } } }
  )

  ${varName}.index(
    { __verifyToken: 1 },
    { unique: true, partialFilterExpression: { __verifyToken: { $exists: true } } }
  )
 
`
}

// indexes
for (const member of model.members) {
  const isUnique = member.isUnique
  if(isUnique && isUnique[0]){
    result += `${varName}.index({ ${member.name}: 1`
    for(const c of isUnique as string[]){
      result += `,${c}: 1`
    }
    result += `}, { unique: true });`
  }
}

result +=`
export const ${lower}Model: Model<${modelName}Model> = model<${modelName}Model>('${structure.id}_${modelName}', ${varName});`;
  return result;
};

export const transformTypeToMongoType = (structure: StructureBackend, member : SchemaModelMember) => {
  
  if (member.relation) {
    let result = 'Schema.Types.ObjectId, ';
    result += `ref: '${structure.id}_${member.relation.relatedModel.modelName}', index: true`;
    return result;
  } 
  
  if (member.type === 'DateTime') {
    return 'Schema.Types.Date';
  } else if (member.type === 'Int') {
    return `Schema.Types.Number`;
  } else {
    return `Schema.Types.${member.modelName}`;
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
