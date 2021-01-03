import { SchemaModel, SchemaModelMember, SchemaModelRelation, SchemaModelRelationType } from '../common/types';

export const extractMemberFromLineParams = (member: SchemaModelMember, params) => {
  
  if (params === '@isUnique') {
    member.isUnique = true;
  }

  // https://stackoverflow.com/questions/16061744/mongoose-how-to-define-a-combination-of-fields-to-be-unique
  if (params.startsWith('@isUnique(combinationWith:')) {
    // handle maximum 5 
    // @isUnique(combinationWith:"Milan1",andCombinationWith:"Jirka2", andCombinationWith:"Karel3", andCombinationWith:"Ondra4", andCombinationWith:"Petr5") 
    const splited = params.split('"')
    // Milan1
    member.isUnique = [splited[1]]
    // Jirka2
    if(splited[3]){
      member.isUnique.push(splited[3])
    }

    // Karel3
    if(splited[5]){
      member.isUnique.push(splited[5])
    }
    // Ondra4
    if(splited[7]){
      member.isUnique.push(splited[7])
    }
    // Petr5
    if(splited[9]){
      member.isUnique.push(splited[9])
    }
  }

  if (params === '@isReadonly') {
    member.isReadonly = true
  }

  if (params.startsWith('@relation(name:')) {
    const name = params.split('"')[1]
    if(name.startsWith('_')) throw `Line: ${member.row} relation name starting with '_' as your '${name}' is reserved`
    member.relation = { name } as SchemaModelRelation;
  }
};

