import { SchemaModel, SchemaModelMember } from '../../common/types'
import { getOnlyOneRelatedMember } from '../../common/utils'
import { constructMember } from './model'

describe('model', () => {
    describe('constructMember', () => {
        it('default with null', () => {
            const test = constructMember({ modelName: 'Number', type: 'Number', isRequired: false, default: null }, { id: 'schema-test-id' })
            expect(test).toEqual('{type: Schema.Types.Number, default: null}')
        })
        it('default with 0', () => {
            const test = constructMember({ modelName: 'Number', type: 'Number', isRequired: false, default: 0 }, { id: 'schema-test-id' })
            expect(test).toEqual('{type: Schema.Types.Number, default: 0}')
        })
        it('default with 123', () => {
            const test = constructMember({ modelName: 'Number', type: 'Number', isRequired: false, default: 123 }, { id: 'schema-test-id' })
            expect(test).toEqual('{type: Schema.Types.Number, default: 123}')
        })

        it('default with text', () => {
            const test = constructMember({ modelName: 'String', type: 'Number', isRequired: false, default: 'default-text' }, { id: 'schema-test-id' })
            expect(test).toEqual("{type: Schema.Types.String, default: 'default-text'}")
        })

        it('default with empty text', () => {
            const test = constructMember({ modelName: 'String', type: 'Number', isRequired: false, default: '' }, { id: 'schema-test-id' })
            expect(test).toEqual("{type: Schema.Types.String, default: ''}")
        })
    })
})
