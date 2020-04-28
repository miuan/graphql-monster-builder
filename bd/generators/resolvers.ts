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
  writeToFile, templateFileToText, templateToText,
} from '../../common/files';
import { getOnlyOneRelatedMember, firstToLower } from '../../common/utils';
import { relatedParamName1Id, relatedParamName1, relatedParamName2Id, relatedParamName2 } from './schema';

const defaultMembers = [
  'createdAt',
  'updatedAt',
  'id',
];


const memberCreateAndRemoveLinks = (model: SchemaModel, member: SchemaModelMember) => {
  const modelName = model.modelName
  const relation = member.relation
  const relatedMember = getOnlyOneRelatedMember(member)
  
  const ret = {
    result : '',
    connect: ''
  }
  
  if(!relatedMember) {
    return ret
  }

  const lower = firstToLower(modelName);
  const relationName = relation.name;
  const funcAddToName = `addTo${relationName}`
  const funcRemoveFromName = `removeFrom${relationName}`

  ret.result = templateFileToText('resolvers-add-remove.ts',{
    _LOWER_NAME_: lower,
    _RELATION_NAME_: relationName,
    _RELATED_PARAM_NAME_1_: relatedParamName1Id(model, relatedMember),
    _RELATED_PARAM_NAME_2_: relatedParamName2Id(member),
    _RELATED_MEMBER_NAME_: relatedMember.name,
    _MEMBER_NAME_: member.name,
    _RELATED_MODEL_NAME_: member.relation.relatedModel.modelName,
    _PAYLOAD_PARAM_1: relatedParamName1(model, relatedMember),
    _PAYLOAD_PARAM_2: relatedParamName2(member),
  })
  
  ret.connect += `${funcAddToName} : ${funcAddToName}(entry, protections),\n${funcRemoveFromName} : ${funcRemoveFromName}(entry, protections),`

  return ret
}

const modelCreateAddRemoveLinks = (model: SchemaModel) => {
  let ret = {
    result: '',
    connect: ''
  }

  for (const member of model.members) {
    if (member.relation) {
      const {result, connect} = memberCreateAndRemoveLinks(model, member)

      ret.result += result
      ret.connect += connect
    }


  }
  return ret
}

export const createResolver = (model : SchemaModel) => {
  const modelName = model.modelName;
  const lower = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const varName =  lower + 'Service';

  const protectionAll = generateProtection(model.protection.all);
  const protectionOne = generateProtection(model.protection.one);
  const protectionCreate = generateProtection(model.protection.create);
  const protectionUpdate = generateProtection(model.protection.update);
  const protectionRemove = generateProtection(model.protection.remove);

  const {result: serviceAddRemove, connect: serviceAddRemoveConnect} = modelCreateAddRemoveLinks(model)

  let file = templateFileToText('resolvers.ts',{
    _RESOLVERS_ADD_REMOVE_CONNECT_: serviceAddRemoveConnect,
    _RESOLVERS_ADD_REMOVE_: serviceAddRemove,
  })

  let result = templateToText(file, {
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
    result += `await protections.user(ctx)`;
  } else if (protection.type === SchemaModelProtectionType.OWNER) {
    const param = protection.param ?  `${protection.param}` : 'user';
    result += `await protections.owner(ctx, data, '${param}')`;
  } else if (protection.type === SchemaModelProtectionType.ROLE) {
    const roles = `'` + protection.roles.join(`','`) + `'`;
    result += `await protections.role(ctx, [${roles}])`;
  } else if (protection.type === SchemaModelProtectionType.FILTER) {
    const roles = protection.roles.length > 0 ? `['` + protection.roles.join(`','`) + `']` : 'null';
    let filters = '';
    for (const filter of protection.filter) {
      filters = `,{name: '${filter.name}', value: '${filter.value}'}`;
    }
    
    result += `await protections.filter(ctx, data, [${filters.substr(1)}], ${roles})`;
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
