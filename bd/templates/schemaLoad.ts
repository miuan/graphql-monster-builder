import { makeExecutableSchema } from 'graphql-tools';
import { IResolvers } from 'graphql-tools/dist/Interfaces';
import * as _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs';

/**
 * basic copy link from source to destination
 * to replicate members as was in source
 *
 * @param desc `mergedResolvers.Query` or `mergedResolvers.Mutation`
 * @param source `injection.Query` or `injection.Mutation`
 * @param typeName `(Query|Mutation)`
 */
const mapKeysFromInjection = (desc, source, typeName) => {
  // list of each member from source
  // could be members of `injection.Query` or `injection.Mutation`
  const allMembers = _.keys(source);

  // each member add one by one to `desc`
  allMembers.forEach((memberName) => {
    if (desc[memberName]) {
      // `(Query|Mutation) with name `memberName` already in Resolver
      throw `${typeName} with name ${memberName} already in Resolver`;
    }

    desc[memberName] = source[memberName];
  });
};

/**
 * inject Query, Mutation, DateTime, ... members from `injection`
 * to mergedResolvers into Query respectively Mutation
 *
 * @param mergedResolvers WHERE you would like to inject
 * @param injection WHAT you would like inject
 */
export const addInjectionToMergedResolvers = (mergedResolvers: IResolvers, injection: IResolvers) => {
  // iterate all members of inject as Query, Mutation, DateTime, ...
  for (const memberName in injection) {
    // member with this name is on injection first time
    if (!mergedResolvers[memberName]) {
      mergedResolvers[memberName] = {};
    }
    // inject
    mapKeysFromInjection(mergedResolvers[memberName], injection[memberName], memberName);
  }
};

/**
 * make Executable schema from {resolvers} and loaded schema from file
 *
 * @param resolvers [IResolvers] or IResolver
 * @param schemasFile? path to file with schema
 * @return excutable schema
 */
export const schemaLoad = (resolvers: [IResolvers] | IResolvers, schemasFile = '/graphql/schema.graphql') => {
  const schemas = fs.readFileSync(path.resolve(schemasFile), 'utf8');

  let mergedResolvers: IResolvers;

  // merge just in case if resolvers is a array
  if (resolvers instanceof Array) {
    // setup default merged resolver
    mergedResolvers = {
      Query: {},
      Mutation: {},
      DateTime: {},
    } as IResolvers;

    // each resolver have to by merged into MergedResolvers
    resolvers.forEach((injection: IResolvers) => {
      addInjectionToMergedResolvers(mergedResolvers, injection);
    });
  } else {
    mergedResolvers = resolvers;
  }

  return makeExecutableSchema({
    typeDefs: schemas,
    resolvers: mergedResolvers,
  });
};
