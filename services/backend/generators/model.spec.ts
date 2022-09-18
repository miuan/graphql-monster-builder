import { SchemaModel, SchemaModelMember } from '../../common/types'
import { getOnlyOneRelatedMember } from '../../common/utils'
import { constructImports, constructMember } from './model'

describe('model', () => {
    describe('constructMember', () => {
        it('default with null', () => {
            const test = constructMember({ modelName: 'Number', type: 'Number', isRequired: false, default: null } as any, { id: 'schema-test-id' } as any)
            expect(test).toEqual('{type: Schema.Types.Number, default: null}')
        })
        it('default with 0', () => {
            const test = constructMember({ modelName: 'Number', type: 'Number', isRequired: false, default: 0 } as any, { id: 'schema-test-id' } as any)
            expect(test).toEqual('{type: Schema.Types.Number, default: 0}')
        })
        it('default with 123', () => {
            const test = constructMember({ modelName: 'Number', type: 'Number', isRequired: false, default: 123 } as any, { id: 'schema-test-id' } as any)
            expect(test).toEqual('{type: Schema.Types.Number, default: 123}')
        })

        it('default with text', () => {
            const test = constructMember({ modelName: 'String', type: 'Number', isRequired: false, default: 'default-text' } as any, { id: 'schema-test-id' } as any)
            expect(test).toEqual("{type: Schema.Types.String, default: 'default-text'}")
        })

        it('default with empty text', () => {
            const test = constructMember({ modelName: 'String', type: 'Number', isRequired: false, default: '' } as any, { id: 'schema-test-id' } as any)
            expect(test).toEqual("{type: Schema.Types.String, default: ''}")
        })
    })

    describe('constructImports', () => {
        it('two inports', () => {
            expect(constructImports(['model1', 'model2'])).toMatchInlineSnapshot(`
                "import { model1Schema } from './model1'
                import { model2Schema } from './model2'
                "
            `)
        })
    })
})
