import { SchemaModelMember, SchemaModel, SchemaModelRelationType } from "./types"

export const modelUserWithTodoManyToManyRelation = {
    modelName: 'User',
    members: [{
        modelName: 'Todo',
        name: 'Todo',
        type: 'Todo',
        relation: {
            type: SchemaModelRelationType.MANY_TO_MANY,
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
        relation: {
            type: SchemaModelRelationType.MANY_TO_MANY,
            name: 'UserOnTodo',
        } 
    }] as SchemaModelMember[]
} as SchemaModel

modelUserWithTodoManyToManyRelation.members[0].relation.relatedModel = modelTodoWithUserManyToManyRelation
modelTodoWithUserManyToManyRelation.members[0].relation.relatedModel = modelUserWithTodoManyToManyRelation

export const modelUserWithTodoOneToManyRelation = {
    modelName: 'User',
    members: [{
        name: 'Todo',
        type: 'Todo',
        relation: {
            type: SchemaModelRelationType.ONE_TO_MANY,
            name: 'UserOnTodo',
        } 
    }] as SchemaModelMember[]
} as SchemaModel

export const modelTodoWithUserManyToOneRelation = {
    modelName: 'User',
    members: [{
        name: 'Todo',
        type: 'Todo',
        relation: {
            type: SchemaModelRelationType.MANY_TO_ONE,
            name: 'UserOnTodo',
        } 
    }] as SchemaModelMember[]
} as SchemaModel

modelUserWithTodoOneToManyRelation.members[0].relation.relatedModel = modelTodoWithUserManyToOneRelation
modelTodoWithUserManyToOneRelation.members[0].relation.relatedModel = modelUserWithTodoOneToManyRelation

export const relationUserOnTodo = {
    name: 'Todo',
    type: 'Todo',
    modelName: 'Todo',
    relation: {
        type: SchemaModelRelationType.MANY_TO_MANY,
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

