import { SchemaModel, SchemaModelMember, SchemaModelRelation, SchemaModelRelationType } from '../common/types';

export const extractMemberFromLineParams = (member: SchemaModelMember, params) => {
  if (params === '@isUnique') {
    member.isUnique = true;
  }

  if (params.startsWith('@relation(name:')) {
    member.relation = { name: params.split('"')[1] } as SchemaModelRelation;
  }
};

