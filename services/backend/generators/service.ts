import {
  SchemaModel,
  SchemaModelRelationType,
  Structure,
  SchemaModelMember,
} from '../../common/types';

import {
  writeToFile, templateFileToText,
} from '../../common/files';
import { getOnlyOneRelatedMember, firstToLower } from '../../common/utils';
import { relatedParamName1Id, relatedParamName2Id, relatedParamName1, relatedParamName2 } from './schema';

import logger from '../../log'
import { BackendDirectory } from '../backendDirectory';
const log = logger.getLogger('service')

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
  const relatedModelName = member.relation.relatedModel.modelName

  ret.result = templateFileToText('service-add-remove.ts',{
    _LOWER_NAME_: lower,
    _RELATION_NAME_: relationName,
    _RELATED_PARAM_NAME_1_: relatedParamName1Id(model, relatedMember),
    _RELATED_PARAM_NAME_2_: relatedParamName2Id(member),
    _RELATED_MEMBER_NAME_: relatedMember.name,
    _MEMBER_NAME_: member.name,
    _LOWER_RELATED_MODEL_NAME_: firstToLower(relatedModelName),
    _RELATED_MODEL_NAME_: relatedModelName,
    _PAYLOAD_PARAM_1: relatedParamName1(model, relatedMember),
    _PAYLOAD_PARAM_2: relatedParamName2(member),
  })
  
  ret.connect += `${funcAddToName} : ${funcAddToName}(entry),\n${funcRemoveFromName} : ${funcRemoveFromName}(entry),`

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

export const createService = (model : SchemaModel) => {
  const modelName = model.modelName;
  const lower = firstToLower(modelName);
  const varName =  lower + 'Model';

  const allIdsConversions = conversionsIdsToField(model.members);
  const connectRelationCreate = updateLinkedModels(model.members, 'createdModel.id');
  const connectRelationUpdate = updateLinkedModels(model.members, 'updatedModel.id');
  const disconnectRelations = disconnectLinkedModels(model.members);
  let actionBeforeCreate = '';
  let actionAfterCreate = '';
  let actionBeforeUpdate = '';
  if (modelName === 'User') {
    actionBeforeCreate = `
    if(data.password) {
      data.__password = extras.generateHash(data.password);
      data.password = '******';
    }
`;
    actionAfterCreate = ``;
    actionBeforeUpdate = 'extras.checkPasswordIsNotIncluded(data);';
  }

  const {result: serviceAddRemove, connect: serviceAddRemoveConnect} = modelCreateAddRemoveLinks(model)

  let result = templateFileToText(`service.ts`,{
    _MODEL_NAME_: modelName,
    _LOWER_NAME_: lower,
    VAR_NAME: varName,
    _ALL_IDS_CONVERSIONS_ : allIdsConversions,
    _CONNECT_RELATION_CREATE_: connectRelationCreate,
    _CONNECT_RELATION_UPDATE_: connectRelationUpdate,
    _DISCONNECT_RELATIONS_: disconnectRelations,
    _EXTRA_ACTION_BEFORE_CREATE_: actionBeforeCreate,
    _EXTRA_ACTION_AFTER_CREATE_: actionAfterCreate,
    _EXTRA_ACTION_BEFORE_UPDATE_: actionBeforeUpdate,
    _EXTRA_ACTION_AFTER_UPDATE_: '',
    _SERVICE_ADD_REMOVE_CONNECT_: serviceAddRemoveConnect,
    _SERVICE_ADD_REMOVE_: serviceAddRemove,
  });
  result += '';
  return result;
};

export const disconnectLinkedModels = (members: SchemaModelMember[]) => {
  let result = '';
  // const membersWithRelation = members.every(m => m.relation != null);

  for (const member of members) {
    if (!member.relation) {
      continue;
    }

    const relatedToMany = SchemaModelRelationType.ONE_TO_MANY || SchemaModelRelationType.MANY_TO_MANY;
    const relationModelName = member.relation.relatedModel.modelName;
    const relatedModel = member.relation.relatedModel;
    const relationName = member.relation.name;
    const relatedMember = relatedModel.members.find(m => m.relation && m.relation.name === relationName);
    const relatedMemberName = relatedMember.name;
    const varLinkedIds = `${member.name}LinkedIds`;
    const lower = relationModelName.charAt(0).toLowerCase() + relationModelName.slice(1)
    

    result += `
    if(${varLinkedIds} && ${varLinkedIds}.length > 0) {`;
    if (relatedMember.relation.type === relatedToMany) {
      result += `
        await entry.models['${lower}'].updateMany({}, {
          $pullAll: {${relatedMemberName}: [updatedModel.id]}
        })
      `;
    } else {
      result += `
      await entry.models['${lower}'].updateMany({
        ${relatedMemberName}: updatedModel.id
      }, {
        ${relatedMemberName}: null
      })
    `;
    }
    result += '}';
  }

  return result;
};

export const updateLinkedModels = (members: SchemaModelMember[], currentIdName) => {
  let result = '';
  // const membersWithRelation = members.every(m => m.relation != null);

  for (const member of members) {
    if (!member.relation) {
      continue;
    }

    const relationModelName = member.relation.relatedModel.modelName;
    const relatedModel = member.relation.relatedModel;
    const relationName = member.relation.name;
    const relatedMember = relatedModel.members.find(m => m.relation && m.relation.name === relationName);
    const relatedMemberName = relatedMember.name;
    const varLinkedIds = `${member.name}LinkedIds`;
    const lower = relationModelName.charAt(0).toLowerCase() + relationModelName.slice(1);
    
    result += `
    if(${varLinkedIds} && ${varLinkedIds}.length > 0) {`;
    // TODO: test for relatedMember.relation.type generate correct `updateMany`
    // TODO: test for relatedMember.relation.type set right type corespond to member model
    if (relatedMember.relation.type === SchemaModelRelationType.MANY_TO_MANY || relatedMember.relation.type === SchemaModelRelationType.MANY_TO_ONE) {
      result += `
        await entry.models['${lower}'].updateMany({
          _id: {$in: ${varLinkedIds}}
        }, {
          $push: {${relatedMemberName}: { $each: [${currentIdName}]}}
        })
      `;
    } else {
      result += `
      await entry.models['${lower}'].updateMany({
        _id: {$in: ${varLinkedIds}}
      }, {
        ${relatedMemberName}: ${currentIdName}
      })
    `;
    }
    result += '}';
  }

  return result;
};

export const conversionsIdsToField = (members: SchemaModelMember[]) => {
  let result = '';
  // const membersWithRelation = members.every(m => m.relation != null);

  for (const member of members) {

    if (!member.relation) {
      continue;
    }

    const relatedToMany = SchemaModelRelationType.ONE_TO_MANY || SchemaModelRelationType.MANY_TO_MANY;
    const s = member.relation.type === relatedToMany ? 's' : '';
    const relationModelName = member.relation.relatedModel.modelName;
    const varLinkedIds = `${member.name}LinkedIds`;
    const lower = relationModelName.charAt(0).toLowerCase() + relationModelName.slice(1);
    

    result += `
      const ${varLinkedIds} = [];

      if (data.${member.name}Id${s}) {
        data.${member.name} = data.${member.name}Id${s};
        delete data.${member.name}Id${s};
        if( data.${member.name} instanceof Array){
          ${varLinkedIds}.push(...data.${member.name});
        } else {
          ${varLinkedIds}.push(data.${member.name});
        }
      } else if (data.${member.name}) {
        if( data.${member.name}.length > 0 ){
          for(const c of data.${member.name}){
            const created = await entry.services['${lower}'].create(c);
            ${varLinkedIds}.push(created.id);
          }
          data.${member.name} = ${member.name}LinkedIds;
        } else {
          const created = await entry.services['${lower}'].create(data.${member.name});
          ${varLinkedIds}.push(created.id);
          data.${member.name} = created.id;
        }
      }
    `;
  }
  

  return result;
};

export const generateServiceToFile = (backendDirectory: BackendDirectory, model: SchemaModel) => {
  const str = createService(model);

  backendDirectory.servicesWrite(`${model.modelName}`, str);
};


export const generateServices = (backendDirectory: BackendDirectory, models: SchemaModel[]) => {
  log.trace('generateServices')
  for (const model of models) {
    log.info(`Generate service for model: ${model.modelName}`)
    generateServiceToFile(backendDirectory, model);
  }
};