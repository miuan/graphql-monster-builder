import { isExportDeclaration } from 'typescript'
import { SchemaModel, SchemaModelMember } from '../../common/types'
import { constructMemberWithType, generateInputParamsForMutationModel } from './schema'

describe('schema', () => {
    describe('constructParam', () => {
        it('name', () => {
            const constructedParam = constructMemberWithType('name', 'type', false, false)
            expect(constructedParam).toEqual('name: type')
        })

        it('array', () => {
            const constructedParam = constructMemberWithType('name1', 'type1', true, false)
            expect(constructedParam).toEqual('name1: [type1]')
        })

        it('require', () => {
            const constructedParam = constructMemberWithType('name2', 'type2', false, true)
            expect(constructedParam).toEqual('name2: type2!')
        })

        it('require array', () => {
            const constructedParam = constructMemberWithType('name4', 'type4', true, true)
            expect(constructedParam).toEqual('name4: [type4]!')
        })

        it('require array with required items', () => {
            const constructedParam = constructMemberWithType('name5', 'type5', true, true, true)
            expect(constructedParam).toEqual('name5: [type5!]!')
        })
    })

    describe('generateInputParamsForMutationModel', ()=>{
        it('standard', ()=>{
            const genModel = generateInputParamsForMutationModel({modelName: 'model1', members: [
                {name: 'reqMember1', type: 'String', isRequired: true},
                {name: 'optMember2', type: 'String', isRequired: false} 
            ]} as SchemaModel)

            expect(genModel).toEqual('reqMember1: String!, optMember2: String')
        })

        it('ignoreRequire', ()=>{
            const genModel = generateInputParamsForMutationModel({modelName: 'model1', members: [
                {name: 'reqMember1', type: 'String', isRequired: true},
                {name: 'optMember2', type: 'String', isRequired: false} 
            ]} as SchemaModel, {ignoreRequired:true})

            expect(genModel).toEqual('reqMember1: String, optMember2: String')
        })
    })

    describe('generateInputParamsForMutationModel', () => {
        it('array params', () => {
            const inputParams = generateInputParamsForMutationModel(
                {
                    modelName: 'name',
                    members: [{ name: 'member1', type: 'String', isArray: true }],
                } as SchemaModel,
                {
                    includeId: true,
                    forceRequiredFields: true,
                },
            )

            expect(inputParams).toEqual('id: ID!, member1: [String]')
        })
    })
})
