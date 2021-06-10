import { testResolverUpdate } from "../backend/templates/__generated_resolvers_for_test__/testResolver_filter"
import { SchemaModelMember, SchemaModel, SchemaModelRelationType } from "./types"

export const modelUserWithTodoManyToManyRelation = {
    modelName: 'User',
    members: [{
        modelName: 'Todo',
        name: 'Todo',
        type: 'Todo',
        isArray: true,
        relation: {
            type: SchemaModelRelationType.RELATION,
            name: 'UserOnTodo',
        } 
    }] as SchemaModelMember[]
} as SchemaModel

export const modelTodoWithUserManyToManyRelation = {
    modelName: 'Todo',
    members: [{
        modelName: 'User',
        name: 'User',
        type: 'User',
        isArray: true,
        relation: {
            type: SchemaModelRelationType.RELATION,
            name: 'UserOnTodo',
            relatedModel: modelUserWithTodoManyToManyRelation,
        } 
    }] as SchemaModelMember[]
} as SchemaModel

modelUserWithTodoManyToManyRelation.members[0].relation.relatedModel = modelTodoWithUserManyToManyRelation
modelUserWithTodoManyToManyRelation.members[0].relation.relatedMember = modelTodoWithUserManyToManyRelation.members[0]
modelTodoWithUserManyToManyRelation.members[0].relation.relatedModel = modelUserWithTodoManyToManyRelation
modelTodoWithUserManyToManyRelation.members[0].relation.relatedMember = modelUserWithTodoManyToManyRelation.members[0]

export const modelUserWithTodoOneToManyRelation = {
    modelName: 'User',
    members: [{
        name: 'Todo',
        type: 'Todo',
        isArray: false,
        relation: {
            type: SchemaModelRelationType.RELATION,
            name: 'UserOnTodo',
        } 
    }] as SchemaModelMember[]
} as SchemaModel

export const modelTodoWithUserManyToOneRelation = {
    modelName: 'User',
    members: [{
        name: 'Todo',
        type: 'Todo',
        isArray: true,
        relation: {
            type: SchemaModelRelationType.RELATION,
            name: 'UserOnTodo',
        } 
    }] as SchemaModelMember[]
} as SchemaModel

modelUserWithTodoOneToManyRelation.members[0].relation.relatedModel = modelTodoWithUserManyToOneRelation
modelUserWithTodoOneToManyRelation.members[0].relation.relatedMember = modelTodoWithUserManyToOneRelation.members[0]
modelTodoWithUserManyToOneRelation.members[0].relation.relatedModel = modelUserWithTodoOneToManyRelation
modelTodoWithUserManyToOneRelation.members[0].relation.relatedMember = modelUserWithTodoOneToManyRelation.members[0]

export const relationUserOnTodo = {
    name: 'Todo',
    type: 'Todo',
    modelName: 'Todo',
    isArray: false,
    relation: {
        type: SchemaModelRelationType.RELATION,
        relatedModel: modelUserWithTodoManyToManyRelation,
        name: 'UserOnTodo',
    } 
} as SchemaModelMember

export const relationUserOnPress = {
    relation: {
        name: 'UserOnPress',
    } 
} as SchemaModelMember

export const relationUserOnWall = {
    relation: {
        name: 'UserOnWall',
    } 
} as SchemaModelMember

