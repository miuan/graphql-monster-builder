import {
  SchemaModel,
  SchemaModelRelationType,
  SchemaModelMember,
  SchemaModelRelation,
  SchemaModelProtection,
  SchemaModelProtectionType,
  SchemaModelProtectionParam,
} from '../common/types';
import { MONGOSEE_RESERVED_WORDS } from '../common/constatns';
import { extractMemberFromLineParams } from './members';
import { setupModelsRelations } from './relations';


export const getModelsFromSchema = async (schema): Promise<SchemaModel[]> => {
  const lines = schema.split('\n');

  let currentModel: SchemaModel = null;
  let currentProtection : SchemaModelProtection = generateBaseProtection();
  const models: SchemaModel[] = [] as SchemaModel[];

  const regexp = new RegExp('type ([A-Za-z0-9]*) @model {');
  for (const r in lines) {
    const row: number = Number(r);
    const line = lines[row];
    const matched = line.match(regexp);
    if (line.indexOf('#') === 0) {
      // ** COMMENTS
    } else if (matched && matched.length === 2) {
      // ** START WITH LOADING MEMBER TO MODEL **
      const modelName = matched[1];

      if (!/^[A-Z]/.test(modelName)) {
        throw `Line: ${row} The model name '${modelName}' should start with capital leter '[A-Z]'`;
      }

      currentModel = {
        modelName,
        start: row,
        end: row,
        members: [],
      } as SchemaModel;

    } else if (currentModel && line === '}') {
      // ** CLOSE LOADING MEMBERS TO MODEL **
      currentModel.end = row;
      models.push(currentModel);
      currentModel.protection = currentProtection;
      currentProtection = generateBaseProtection();
      currentModel = null;
    } else if (currentModel && line) {
      // ** ADD MEMBERS TO CURRENT MODEL **
      const member = extractMemberFromLine(line, row);
      // maybe is empty line check it
      if(member) {
        currentModel.members.push(member)
      }
    } else if (!currentModel && line) {
      scanProtectionLine(line, currentProtection, row);
    }
  }


  setupModelsRelations(models)
  checkForErrorsInModels(models)
  addMissingFieldIntoModels(models)
  
  return models;
};


export const addMissingFieldIntoModels = (models: SchemaModel[]) => {
  let presenceOfRoleModel = false
  let presenceOfUserModel = models.find((m)=>m.modelName=='User')

  const adminRole:SchemaModelProtectionParam = {
    roles:['admin'],
    type: 3
  } as any


  if(!presenceOfUserModel){
    models.push({
      modelName: 'User',
      protection: {
        all: [adminRole],
        one: [adminRole],
        create: [adminRole],
        update: [adminRole],
        remove:[adminRole]
      },
      members: [],
      start: -1,
      end: -1,
    })
  }

  models.push({
    modelName: 'UserRole',
    protection: {
      all: [adminRole],
      one: [adminRole],
      create: [adminRole],
      update: [adminRole],
      remove:[adminRole]
    },
    members: [{
      name:'name',
      modelName: 'String',
      type: 'String',
      isRequired: true,
      isUnique: true,
      relation: null,
      isArray: false,
      row:-1,
      isReadonly: false

    }],
    start: -1,
    end: -1,
  })

  for(const model of models){
    let presenceOfId = false
    let presenceOfEmail = model.modelName !== 'User'
    let presenceOfPassword =  model.modelName !== 'User'
    let presenceOfVerification =  model.modelName !== 'User'
    let presenceOfUserRelationToRole = model.modelName !== 'User'
    let presenceOfRoleName = model.modelName !== 'UserRole'
    let presenceOfRoleRelationToUser = model.modelName !== 'UserRole'
   

    for(const member of model.members){
      if(member.name == 'id') presenceOfId = true
      else if(member.name == 'email') presenceOfEmail = true
      else if(member.name == 'password') presenceOfPassword = true
      else if(member.name == 'verified') presenceOfVerification = true
      else if(member.name == 'roles') presenceOfUserRelationToRole = true
      else if(member.name == 'name') presenceOfRoleName = true
    }

    if(!presenceOfId) model.members.push({name: 'id', type: 'ID', modelName: 'ID', isArray: false, isRequired: true, isUnique: true, isReadonly: true, row: -1, relation: null})
    if(!presenceOfEmail) model.members.push({name: 'email', type: 'String', modelName: 'String', isArray: false, isRequired: true, isUnique: true, isReadonly: true, row: -1, relation: null})
    if(!presenceOfPassword) model.members.push({name: 'password', type: 'String', modelName: 'String', isArray: false, isRequired: true, isUnique: false, isReadonly: true, row: -1, relation: null})
    if(!presenceOfVerification) model.members.push({name: 'verified', type: 'Boolean', modelName: 'Boolean', isArray: false, isRequired: false, isUnique: false, isReadonly: true, row: -1, relation: null})
    if(!presenceOfRoleName) model.members.push({name: 'name', type: 'String', modelName: 'String', isArray: false, isRequired: true, isUnique: true, isReadonly: true, row: -1, relation: null})
    if(!presenceOfUserRelationToRole) model.members.push({name: 'roles', type: '[UserRole]', modelName: 'UserRole', isArray: true, isRequired: true, isUnique: false, isReadonly: false, row: -1, relation: {
      createFromAnotherModel:true,
      inputName:'UserrolesUserRole',
      name:'_RoleOnUser',
      relatedModel:models.find((m)=>m.modelName=='UserRole'),
      type:3
    } as any})
    if(!presenceOfRoleRelationToUser) model.members.push({name: 'users', type: '[User]', modelName: 'User', isArray: true, isRequired: true, isUnique: false, isReadonly: false, row: -1, relation: {
      createFromAnotherModel:false,
      inputName:'UserRoleusersUser',
      name:'_RoleOnUser',
      relatedModel:models.find((m)=>m.modelName=='User'),
      type:3
    } as any})
  }
}


export const checkForErrorsInModels = (models: SchemaModel[]) => {
  let reservedInUser = ['email', 'password', 'verified', 'roles']

  for(const model of models){
    if(model.modelName == 'UserRole') throw `Line: ${model.start} Model: ${model.modelName} have reserved name and will be add automaticaly`
    
    for(const member of model.members){
      if(model.modelName == 'User' && reservedInUser.indexOf(member.name) != -1) throw `Line: ${model.start} Model: ${model.modelName} are these fields names ${reservedInUser} reserved and will be add automaticaly`
      else if(member.name == 'ID') throw `Line: ${member.row} Model: ${model.modelName} are ID is reserved and will be add automaticaly`
    }
  }
}


export const scanProtectionLine = (line: String, protection:SchemaModelProtection, row: number) => {
  const units = line.split(' ');

  for (const unit of units) {
    scanProtectionUnit(unit, protection, row);
  }
};

export const scanProtectionUnit = (unit: string, protection:SchemaModelProtection, row: number) => {
  const regexp = new RegExp('@[a-z]*\\(');
  const matched = unit.match(regexp);
  
  if (!matched || matched.length !== 1) {
    return;
  }

  const protectRaw = matched[0];
  // remove first '@' and on end '('
  const protectFor = protectRaw.substr(1, protectRaw.length - 2);
  const paramsRaw = unit.split(protectRaw)[1];
  // remove first '"' and on end '"'
  const params = paramsRaw.substr(0, paramsRaw.length - 1).split(',');

  if (params.length < 1 || params[0].length < 1) {
    // tslint:disable-next-line:max-line-length
    throw `Protection '${unit}' on row: ${row} have empty type, basic supported types are 'public','user','owner','role'`;
  }

  let mainParams;
  let typeString = '';
  const param:SchemaModelProtectionParam = {
    type: SchemaModelProtectionType.PUBLIC,
    typeName: typeString,
    roles:[],
    filter:[],
    whitelist: [],
    blacklist:[],
  } as SchemaModelProtectionParam;
  
  for (const p of params) {
    mainParams = p.split(':');
    // tslint:disable-next-line:max-line-length
    typeString = cleanParameter(mainParams[0]);
    const value = mainParams.length > 1 ? cleanParameter(mainParams[1]) : null; 

    protectionCheckTheParameter(param, typeString, value, unit, row);
  }

  if (protectFor === 'all') {
    protection.all.push(param);
  } else if (protectFor === 'one') {
    protection.one.push(param);
  } else if (protectFor === 'create') {
    protection.create.push(param);
  } else if (protectFor === 'update') {
    protection.update.push(param);
  } else if (protectFor === 'remove') {
    protection.remove.push(param);
  }
};

export const protectionCheckTheParameter = (param:SchemaModelProtectionParam, typeName: string, value: string, unit: string, row: number) => {
  if (typeName === 'public') {
    updateType(param, typeName, SchemaModelProtectionType.PUBLIC);
  } else if (typeName === 'user') {
    updateType(param, typeName, SchemaModelProtectionType.USER);
  } else if (typeName === 'owner') {
    updateType(param, typeName, SchemaModelProtectionType.OWNER);
    param.param = value;
  } else if (typeName === 'role') {
    updateType(param, typeName, SchemaModelProtectionType.ROLE);
    param.roles.push(value);
  } else if (typeName === 'filter') {
    updateType(param, typeName, SchemaModelProtectionType.FILTER);
    const stl = value.split('=');
    param.filter.push({
      name: cleanParameter(stl[0]),
      value: cleanParameter(stl[1]),
    });
  } else {
    // tslint:disable-next-line:max-line-length
    throw `Protection '${unit}' on row: ${row} have unknow parameter name '${typeName}' supported types are 'public','user','owner','role', 'filter'`;
  }
};

export const cleanParameter = (param: string): string => {
  let cleaned = param;

  if (cleaned[0] === '"') {
    cleaned = cleaned.substr(1);
  }

  if (cleaned[cleaned.length - 1] === '"') {
    cleaned = cleaned.substr(0, cleaned.length - 1);
  }

  return cleaned;
};

export const updateType = (param:SchemaModelProtectionParam, typeName: string, type: SchemaModelProtectionType) => {
  // the FILTER is type what should not be overrieded
  // in case is two or more params like filter or role
  // filter should be know as 
  if (param.type === SchemaModelProtectionType.FILTER) {
    return;
  }

  param.type = type;
  param.typeName = typeName;
};

export const generateBaseProtection = (): SchemaModelProtection  => {
  return {
    all : [{
      type: SchemaModelProtectionType.ROLE,
      roles: ['admin'],
      filter: [],
      whitelist: [],
      blacklist: [],
    }],
    one : [{
      type: SchemaModelProtectionType.ROLE,
      roles: ['admin'],
      filter: [],
      whitelist: [],
      blacklist: [],
    }],
    create : [{
      type: SchemaModelProtectionType.ROLE,
      roles: ['admin'],
      filter: [],
      whitelist: [],
      blacklist: [],
    }],
    update : [{
      type: SchemaModelProtectionType.ROLE,
      roles: ['admin'],
      filter: [],
      whitelist: [],
      blacklist: [],
    }],
    remove : [{
      type: SchemaModelProtectionType.ROLE,
      roles: ['admin'],
      filter: [],
      whitelist: [],
      blacklist: [],
    }],
  } as SchemaModelProtection;
};


export const extractMemberFromLine = (line: string, row: number): SchemaModelMember => {
  const nameAndType = line.trim().split(':');

  // empty line we can skip
  if(line.length < 2){
    return null
  }

  const name = nameAndType[0];
  const typeParams = nameAndType[1].trim().split(' ');
  
  // https://mongoosejs.com/docs/api.html#schema_Schema.reserved
  if (MONGOSEE_RESERVED_WORDS.indexOf(name) !== -1) {
    throw `The member name '${name}' on line:${row} is reserved, reserved words: ${MONGOSEE_RESERVED_WORDS}`;
  }

  if (!/^[_A-Za-z]/.test(name)) {
    throw `The member name '${name}' on line:${row} should start with regular character '[A-Za-z]'`;
  }

  const member: SchemaModelMember = {
    row,
    name,
    isRequired: false,
    isUnique: false,
  } as SchemaModelMember;



  const required = typeParams[0].endsWith('!');
  member.type = !required ? typeParams[0] : typeParams[0].substr(0, typeParams[0].length - 1);
  member.isRequired = required;
  member.modelName = member.type.replace('[', '').replace(']','').replace('!', '');
  member.isArray = member.type.startsWith('[');

  if (typeParams.length > 1) {
    const splited = line.split('@')
    splited.shift()
    for(const param of splited){
      extractMemberFromLineParams(member, `@${param.trim()}`)
    }
  }

  if(!member.relation &&  !['ID','Boolean','String', 'Int','DateTime'].includes(member.modelName)){
    throw new Error(`Line ${row}: Unknown type ${member.modelName}`)
  }

  return member;
};
