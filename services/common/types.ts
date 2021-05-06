export type SchemaModel = {
  modelName: string;
  start: number;
  end: number;
  members: SchemaModelMember[]
  protection: SchemaModelProtection
};

export enum SchemaModelRelationType {
  ONE_TO_MANY, // me as one to many
  MANY_TO_ONE, // me as multi to one
  ONE_TO_ONE,
  MANY_TO_MANY,
}

export type SchemaModelRelation = {
  name: string,
  type: SchemaModelRelationType,
  inputName: string,
  relatedModel: SchemaModel,
  createFromAnotherModel: boolean,
  payloadNameForAddOrDelete: string,
  error: string,
};

export type SchemaModelMember = {
  name : string;
  type: string;
  modelName: string;
  isRequired: boolean;
  isUnique: boolean | string[];
  relation: SchemaModelRelation;
  isArray: boolean;
  row: number;
  isReadonly: boolean;
  default?: number | string
  regExp?: string
  placeholder?: string
};

export enum SchemaModelProtectionType {
  PUBLIC, 
  USER,
  OWNER, 
  ROLE,
  FILTER,
}

export type SchemaModelProtectionParam = {
  type: SchemaModelProtectionType,
  typeName: string;
  roles: string[],
  filter: SchemaModelProtectionFilter[],
  whitelist: string[],
  blacklist: string[],
  param: String,
};

export type SchemaModelProtectionFilter = {
  name: string,
  value: string;
};

export type SchemaModelProtection = {
  all: SchemaModelProtectionParam[],
  one: SchemaModelProtectionParam[],
  create: SchemaModelProtectionParam[],
  update: SchemaModelProtectionParam[],
  remove: SchemaModelProtectionParam[],
};




export type StructureItem = {
  dir: string;
  modules: string[];
};

export type Structure = {
  id: string;
};

export type StructureBackend = Structure & {
  index: StructureItem;
  schema: StructureItem;
  gen: StructureItem;
  models: StructureItem;
  resolvers: StructureItem;
  services: StructureItem;
};

export type StructureFrontend = Structure & {
  index: StructureItem;
  gen: StructureItem;
  graphql: StructureItem;
};
