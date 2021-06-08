import { SchemaModel, SchemaModelMember } from '../../common/types'
import { getOnlyOneRelatedMember } from '../../common/utils'
import { createResolvers, genAddingAndRemovingsForModel } from './entry'

const memberZero = {
    name: 'memberZero',
    modelName: 'Zero',
    isArray: true,
    relation: { name: 'relation1', relatedModel: {} },
} as SchemaModelMember

const modelZero = {
    modelName: 'modelZero',
    members: [memberZero],
} as SchemaModel

const memberAnaconda = {
    name: 'memberAnaconda',
    modelName: 'Anaconda',
    relation: { name: 'relation1', relatedModel: modelZero, relatedMember: modelZero.members[0] },
    isArray: true,
} as SchemaModelMember

const modelAnaconda = {
    modelName: 'modelAnaconda',
    members: [memberAnaconda],
} as SchemaModel

memberZero.relation.relatedModel = modelAnaconda
memberZero.relation.relatedMember = memberAnaconda

describe('entry', () => {
    it('getOnlyOneRelatedMember:anaconda', () => {
        const selected = getOnlyOneRelatedMember(memberAnaconda)
        expect(selected.modelName).toEqual(modelAnaconda.modelName)
    })

    it('getOnlyOneRelatedMember:zero', () => {
        const selected = getOnlyOneRelatedMember(memberZero)
        expect(selected).toBeNull()
    })

    it('genAddingAndRemovingsForModel', () => {
        const addings = genAddingAndRemovingsForModel(modelAnaconda)
        expect(addings).toBe('')
    })
})
