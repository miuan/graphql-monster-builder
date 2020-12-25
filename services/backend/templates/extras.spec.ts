import * as extras from './extras'
import { mocked }  from 'ts-jest/utils'

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

    describe('generateParentLogin', ()=> {

        let genPasswordAndTokensStub = jest.spyOn(extras, 'genPasswordAndTokens')

        afterEach(()=>{
            mocked(genPasswordAndTokensStub).mockClear()
        })

        afterAll(()=>{
            mocked(extras.genPasswordAndTokens).mockRestore()
        })

        
        it('should pass', async () => {
            const saveStub = jest.fn()
            const findOneStub = jest.fn().mockImplementation(()=>({
                token: '1', 
                save:saveStub
            }))
            const sendStub = jest.fn()
            const genPasswordAndTokensStub = jest.spyOn(extras, 'genPasswordAndTokens').mockImplementation(()=>{})
            
            process.env.PARENT_ACCESS_TOKEN = '123'
            process.env.ADMIN_EMAIL = 'admin@email.com'
            const parentLogin = extras.generateParentLogin({
                models: {
                    user: {
                        findOne: findOneStub
                    }
                }
            })

            await parentLogin({
                query: {parentAccessToken: '123'},
                send: sendStub
            })

            expect(findOneStub).toBeCalledWith({email: 'admin@email.com'})
            expect(genPasswordAndTokensStub).not.toBeCalled()
            expect(sendStub).toBeCalledWith({token: '1'})
            expect(saveStub).not.toBeCalled()
        })

        it('should pass and generate new tokens', async () => {
            const saveStub = jest.fn()
            const findOneStub = jest.fn().mockResolvedValue({
                save:saveStub
            })
            const sendStub = jest.fn()
            genPasswordAndTokensStub.mockImplementation((user)=>{
                user.token = 'genPasswordAndTokensStub-token-1'
            })
            
            process.env.PARENT_ACCESS_TOKEN = '123'
            process.env.ADMIN_EMAIL = 'admin@email.com'
            const parentLogin = extras.generateParentLogin({
                models: {
                    user: {
                        findOne: findOneStub
                    }
                }
            })
            
            await parentLogin({
                query: {parentAccessToken: '123'},
                send: sendStub
            })

            expect(findOneStub).toBeCalledWith({email: 'admin@email.com'})
            expect(genPasswordAndTokensStub).toBeCalled()
            expect(sendStub).toBeCalledWith({token: 'genPasswordAndTokensStub-token-1'})
        })
        it('should fail', async () => {
            const saveStub = jest.fn()
            const findOneStub = jest.fn().mockImplementation(()=>({
                token: '1', 
                save:saveStub
            }))
            const sendStub = jest.fn()
            const genPasswordAndTokensStub = jest.spyOn(extras, 'genPasswordAndTokens').mockImplementation(()=>{})
            
            process.env.PARENT_ACCESS_TOKEN = '123'
            process.env.ADMIN_EMAIL = 'admin@email.com'
            const parentLogin = extras.generateParentLogin({
                models: {
                    user: {
                        findOne: findOneStub
                    }
                }
            })

            await expect( parentLogin({
                query: {parentAccessToken: 'wrong123'},
                send: sendStub
            })).rejects.toEqual('Unknown parent access token')

            expect(findOneStub).not.toBeCalled()
            expect(genPasswordAndTokensStub).not.toBeCalled()
            expect(sendStub).not.toBeCalled()
        })
    })

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