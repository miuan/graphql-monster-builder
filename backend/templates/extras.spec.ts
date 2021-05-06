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
            
            process.env.PARENT_ACCESS_TOKEN = '7674123'
            process.env.PARENT_ACCESS_USER_ID = '4321123'
            process.env.ADMIN_EMAIL = 'admin@email.com'
            const parentLogin = extras.generateParentLogin({
                models: {
                    user: {
                        findOne: findOneStub
                    }
                }
            })

            const ctx = {
                params: {
                    parentAccessToken: '7674123',
                    parentUserId: '4321123'
                },
                body: null
            }

            await parentLogin(ctx)

            expect(findOneStub).toBeCalledWith({email: 'admin@email.com'})
            expect(genPasswordAndTokensStub).not.toBeCalled()
            expect(ctx.body).toEqual({token: '1'})
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
            
            process.env.PARENT_ACCESS_TOKEN = '7674123'
            process.env.PARENT_ACCESS_USER_ID = '4321123'
            process.env.ADMIN_EMAIL = 'admin@email.com'

            const parentLogin = extras.generateParentLogin({
                models: {
                    user: {
                        findOne: findOneStub
                    }
                }
            })
            
            const ctx = {
                params: {
                    parentAccessToken: '7674123',
                    parentUserId: '4321123'
                },
                body: null
            }

            await parentLogin(ctx)

            expect(findOneStub).toBeCalledWith({email: 'admin@email.com'})
            expect(genPasswordAndTokensStub).toBeCalled()
            expect(ctx.body).toEqual({token: 'genPasswordAndTokensStub-token-1'})
        })

        it('should fail wrong parent access token', async () => {
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
                params: {parentAccessToken: 'wrong123'},
                send: sendStub
            })).rejects.toEqual('Unknown parent access token')

            expect(findOneStub).not.toBeCalled()
            expect(genPasswordAndTokensStub).not.toBeCalled()
            expect(sendStub).not.toBeCalled()
        })

        it('should fail wrong access user id', async () => {
            const saveStub = jest.fn()
            const findOneStub = jest.fn().mockImplementation(()=>({
                token: '1', 
                save:saveStub
            }))
            const sendStub = jest.fn()
            const genPasswordAndTokensStub = jest.spyOn(extras, 'genPasswordAndTokens').mockImplementation(()=>{})
            
            process.env.PARENT_ACCESS_TOKEN = '123'
            process.env.PARENT_ACCESS_USER_ID = '123'
            process.env.ADMIN_EMAIL = 'admin@email.com'
            const parentLogin = extras.generateParentLogin({
                models: {
                    user: {
                        findOne: findOneStub
                    }
                }
            })

            await expect( parentLogin({
                params: {
                    parentAccessToken: '123',
                    parentUserId: 'wrong123'
                },
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