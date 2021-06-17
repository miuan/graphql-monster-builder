import { SchemaModel, SchemaModelMember, SchemaModelRelation } from "../../common/types"
import { createModelTypeFromModel, transformMemberTypeToTypescriptType } from "./model-types"
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
            modelName: 'Todo'
        } as SchemaModel, [{
            name: 'name',
            type: 'String'
        },{
            name: 'isDone',
            type: 'Boolean'
        }] as SchemaModelMember[])).toMatchSnapshot()
    })

})