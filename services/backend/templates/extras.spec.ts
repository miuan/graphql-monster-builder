import * as extras from './extras'


describe('extras', () => {
    it.todo('filterGen')
    it.todo('generateProtections: user')
    it.todo('generateProtections: owner')
    it.todo('generateProtections: role')
    it.todo('generateProtections: filter')
    it.todo('generateChangePassword')
    it.todo('generateLogin')
    it.todo('checkPasswordIsNotIncluded')
    it.todo('genPasswordAndTokens')
    it.todo('generateTokenJWT')
    it.todo('generateHash')
    describe('checkDataContainProtectedFields', () => {
        it('should pass no issues with checkDataContainProtectedFields', ()=>{
            const found  = extras.checkDataContainProtectedFields({
                    name: 'name1',
                    personal: {
                        year: 2001,
                        contacts: {
                            tel: 'phone-number'
                        }
                    }
                })
           
            expect(found).toHaveLength(0)
        })

        it('should pass no issues with checkDataContainProtectedFields', ()=>{
            const found  = extras.checkDataContainProtectedFields({
                name: 'name1',
                __private: 3,
                __private_text: 'who ho ho',
                personal: {
                    year: 2001,
                    __unreachable: 'also not editable',
                    contacts: {
                        tel: 'phone-number',
                        __connect_code: 'also not editable',
                    }
                }
            })
       
            expect(found).toHaveLength(4)
            expect(found).toMatchSnapshot()
        })
    })
})