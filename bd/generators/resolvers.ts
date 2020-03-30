import {
  SchemaModel,
  SchemaModelRelationType,
  Structure,
  SchemaModelMember,
  SchemaModelProtection,
  SchemaModelProtectionParam,
  SchemaModelProtectionType,
} from '../../common/types';

import {
  writeToFile, templateToText,
} from '../../common/files';

const defaultMembers = [
  'createdAt',
  'updatedAt',
  'id',
];
export const createResolver = (model : SchemaModel) => {
  const modelName = model.modelName;
  const lower = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const varName =  lower + 'Service';

  const protectionAll = generateProtection(model.protection.all);
  const protectionOne = generateProtection(model.protection.one);
  const protectionCreate = generateProtection(model.protection.create);
  const protectionUpdate = generateProtection(model.protection.update);
  const protectionRemove = generateProtection(model.protection.remove);

  let result = templateToText('tmpl.resolvers.ts',{
    _MODEL_NAME_: modelName,
    _MODEL_LOWER_NAME_: lower,
    _PROTECT_ALL_: protectionAll,
    _PROTECT_ONE_: protectionOne,
    _PROTECT_CREATE_: protectionCreate,
    _PROTECT_UPDATE_: protectionUpdate,
    _PROTECT_REMOVE_: protectionRemove,
  });
  result += '';
  return result;
};

export const generateProtection = (protection : SchemaModelProtectionParam[]) => {
  let result = '';
  for (const protectionParam of protection) {
    result += '&& !' + generateProtectionFromParam(protectionParam) + '\n';
  }

  result = 'if(' + result.substr(3) + `){
    ctx.throw(401, 'Unauhorized');
  }`;

  return result;
};

export const generateProtectionFromParam = (protection : SchemaModelProtectionParam) => {
  let result = '';

  if (protection.type === SchemaModelProtectionType.PUBLIC) {
    result += `await protections.public()`;
  } else if (protection.type === SchemaModelProtectionType.USER) {
    result += `await protections.user()`;
  } else if (protection.type === SchemaModelProtectionType.OWNER) {
    const param = protection.param ?  `${protection.param}` : 'user';
    result += `await protections.owner('${param}')`;
  } else if (protection.type === SchemaModelProtectionType.ROLE) {
    const roles = `'` + protection.roles.join(`','`) + `'`;
    result += `await protections.role([${roles}])`;
  } else if (protection.type === SchemaModelProtectionType.FILTER) {
    const roles = protection.roles.length > 0 ? `['` + protection.roles.join(`','`) + `']` : 'null';
    let filters = '';
    for (const filter of protection.filter) {
      filters = `,{name: '${filter.name}', value: '${filter.value}'}`;
    }
    
    result += `await protections.filter([${filters.substr(1)}], ${roles})`;
  }
  return result;
};



export const generateResolverToFile = (structure: Structure, model: SchemaModel) => {
  const str = createResolver(model);

  writeToFile(structure.resolvers, `${model.modelName}`, str);
};


export const generateResolvers = (structure: Structure, models: SchemaModel[]) => {
  for (const model of models) {
    generateResolverToFile(structure, model);
  }
};
