import { SchemaModel, SchemaModelMember, SchemaModelRelation } from "../../common/types"
import { createModelTypeFromModel, generateModelTypes, transformMemberTypeToTypescriptType } from "./model-types"
import { BackendDirectory } from "../backendDirectory";

describe('typescript-type', ()=>{
    describe('transformTypeToTypescriptType', ()=>{
        it.each([
            ['String', 'string'],
            ['DateTime', 'Date'],
            ['Int', 'number'],
            ['Float', 'number'],
            ['Boolean', 'Boolean'],
            ['ID', 'string'],
        ])('should transform simple type %s to %s', (i, o)=>{
            expect(transformMemberTypeToTypescriptType({type: i} as SchemaModelMember)).toEqual(o)
        })

        it.each([
            ['String', 'string[]'],
            ['DateTime', 'Date[]'],
            ['Int', 'number[]'],
            ['Float', 'number[]'],
            ['Boolean', 'Boolean[]'],
        ])('should transform simple array type %s to %s', (i, o)=>{
            expect(transformMemberTypeToTypescriptType({type: i, isArray: true} as SchemaModelMember)).toEqual(o)
        })

        it.each([
            ['Todo', 'TodoModel'],
            ['User', 'UserModel'],
        ])('should transform related member %s to %s', (i, o)=>{
            expect(transformMemberTypeToTypescriptType({
                relation:{
                    relatedModel:{modelName: i}
                } as SchemaModelRelation
            } as SchemaModelMember)).toEqual(o)
        })

        it.each([
            ['Todo', 'TodoModel[]'],
            ['User', 'UserModel[]'],
        ])('should transform related member array type %s to %s', (i, o)=>{
            expect(transformMemberTypeToTypescriptType({
                isArray: true,
                relation:{
                    relatedModel:{modelName: i}
                } as SchemaModelRelation
            } as SchemaModelMember)).toEqual(o)
        })
    })

    describe('createTypescriptType', ()=>{
        expect(createModelTypeFromModel({
            modelName: 'Todo',
            members: [{
                name: 'name',
                type: 'String'
            },{
                name: 'isDone',
                type: 'Boolean'
            }]
        } as SchemaModel)).toMatchSnapshot()
    })

    describe('generateTypescriptTypes', ()=>{
       
        it('should call 2x createTypescriptType and 1x writeToFile inside generateTypescriptTypes', ()=>{
            const backendDirectory = new BackendDirectory()
            backendDirectory.genWrite = jest.fn()

            generateModelTypes(backendDirectory, [{
                modelName: 'Todo',
                members: [{
                    name: 'name',
                    type: 'String'
                },{
                    name: 'isDone',
                    type: 'Boolean'
                }]
            } as SchemaModel,
            {
                modelName: 'User',
                members: [{
                    name: 'email',
                    type: 'String'
                },{
                    name: 'password',
                    type: 'Boolean'
                },{
                    name: 'todos',
                    isArray: true,
                    relation:{
                        relatedModel:{modelName: 'Todo'}
                    } as SchemaModelRelation
                }]
            } as SchemaModel])

            expect(backendDirectory.genWrite).toHaveBeenCalledTimes(1)
            expect((<any>backendDirectory.genWrite).mock.calls[0]).toMatchSnapshot()
        })

    })
})