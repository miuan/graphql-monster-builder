import * as extras from './extras'
import { mocked } from 'ts-jest/utils'

describe('extras', () => {
    it.todo('filterGen')
    it.todo('generateProtections: user')
    it.todo('generateProtections: owner')
    it.todo('generateProtections: role')
    it.todo('generateChangePassword')
    it.todo('generateLogin')
    it.todo('checkPasswordIsNotIncluded')
    it.todo('genPasswordAndTokens')
    it.todo('generateTokenJWT')
    it.todo('generateHash')
    describe('propertiesToArray', () => {
        it('1', () => {
            const pa = extras.propertiesToArray({
                AND: [
                    {
                        OR: [
                            {
                                some: { id: '1' },
                            },
                        ],
                    },
                    { AND: [{ user: { id: 'every' } }, { deer: { id: '1' } }] },
                ],
            })

            expect(pa).toEqual(['AND.0.OR.0.some.id', 'AND.1.AND.0.user.id', 'AND.1.AND.1.deer.id'])
        })
    })

    describe('filterValue', () => {
        it('find userId in root', () => {
            const filter = {
                user: { id: 'userId1' },
            }

            const { value, path, pathIs } = extras.filterValue(filter, 'user.id')
            expect(value).toEqual('userId1')
            expect(path).toEqual([])
            expect(pathIs).toEqual(extras.PATHIS.ALWAYS)
        })

        it('find userId after AND', () => {
            const filter = {
                AND: [
                    {
                        user: { id: 'userId1' },
                    },
                ],
            }

            const { value, path, pathIs } = extras.filterValue(filter, 'user.id')
            expect(value).toEqual('userId1')
            expect(path).toEqual(['AND'])
            expect(pathIs).toEqual(extras.PATHIS.ALWAYS)
        })

        it('find userId after AND AND', () => {
            const filter = {
                AND: [
                    {
                        AND: [
                            {
                                user: { id: 'userId1' },
                            },
                        ],
                    },
                ],
            }

            const { value, path, pathIs } = extras.filterValue(filter, 'user.id')
            expect(value).toEqual('userId1')
            expect(path).toEqual(['AND', 'AND'])
            expect(pathIs).toEqual(extras.PATHIS.ALWAYS)
        })

        it('find userId after OR AND', () => {
            const filter = {
                OR: [
                    {
                        AND: [
                            {
                                user: { id: 'userId1' },
                            },
                        ],
                    },
                ],
            }

            const { value, path, pathIs } = extras.filterValue(filter, 'user.id')
            expect(value).toEqual('userId1')
            expect(path).toEqual(['OR', 'AND'])
            expect(pathIs).toEqual(extras.PATHIS.SOME)
        })

        it('userId not present', () => {
            const filter = {
                OR: [
                    {
                        AND: [
                            {
                                noUserId: 'userId1',
                            },
                        ],
                    },
                ],
            }

            const { value, path, pathIs } = extras.filterValue(filter, 'user.id')
            expect(value).toEqual(null)
            expect(path).toEqual(null)
            expect(pathIs).toEqual(extras.PATHIS.NEVER)
        })

        it('find simple value', () => {
            const filter = {
                OR: [
                    {
                        AND: [
                            {
                                value: 'value-1',
                            },
                        ],
                    },
                ],
            }

            const { value, path, pathIs } = extras.filterValue(filter, 'value')
            expect(value).toEqual('value-1')
            expect(path).toEqual(['OR', 'AND'])
            expect(pathIs).toEqual(extras.PATHIS.SOME)
        })

        it('should not determine find value because is in filter twice', () => {
            const filter = {
                OR: [
                    {
                        AND: [
                            {
                                value: 'value-1',
                            },
                        ],
                    },
                    {
                        value: 'value-1',
                    },
                ],
            }

            const { value, path, pathIs } = extras.filterValue(filter, 'value')
            expect(value).toEqual(undefined)
            expect(path).toEqual(undefined)
            expect(pathIs).toEqual(extras.PATHIS.UNDETERMINED)
        })
    })
    describe('generateProtections: filter', () => {
        it('should return false because no user in ctx', async () => {
            const protection = extras.generateProtections({ models: { userRole: {} } }, 'model-name-test')
            expect(await protection.filter({}, {}, [{ userId: '{{userId}}' }], null)).toBeFalsy()
        })

        it('should return false because no filter', async () => {
            const protection = extras.generateProtections({ models: { userRole: {} } }, 'model-name-test')
            expect(await protection.filter({ state: { user: { id: 'user-id-1' } } }, {}, [{ userId: '{{userId}}' }], null)).toBeFalsy()
        })

        it('should return false because filter starts with OR', async () => {
            const protection = extras.generateProtections({ models: { userRole: {} } }, 'model-name-test')
            expect(await protection.filter({ state: { user: { id: 'user-id-1' } } }, { filter: [{ OR: [{ userId: '1' }] }] }, [{ userId: '{{userId}}' }], null)).toBeFalsy()
        })

        it('should return false because filter userId:1 is not same as allowed filter userId:{{userId}}', async () => {
            const protection = extras.generateProtections({ models: { userRole: {} } }, 'model-name-test')
            expect(await protection.filter({ state: { user: { id: 'user-id-1' } } }, { filter: [{ AND: [{ userId: '1' }] }] }, [{ userId: '{{userId}}' }], null)).toBeFalsy()
        })

        it('should return false because filter user.id is not same as context user (allowed filter userId:{{userId}}', async () => {
            const protection = extras.generateProtections({ models: { userRole: {} } }, 'model-name-test')
            expect(
                await protection.filter({ state: { user: { id: 'user-id-1' } } }, { filter: [{ user_every: { id: 'wrong-user-id' } }] }, [{ name: 'user_every.id', value: '{{userId}}' }], null),
            ).toBeFalsy()
        })

        it('should return TRUE because filter user.id is same as context user (allowed filter userId:{{userId}}', async () => {
            const protection = extras.generateProtections({ models: { userRole: {} } }, 'model-name-test')
            expect(
                await protection.filter({ state: { user: { id: 'user-id-1' } } }, { filter: [{ user_every: { id: 'user-id-1' } }] }, [{ name: 'user_every.id', value: '{{userId}}' }], null),
            ).toBeTruthy()
        })

        it('should return false because filter user.id is different than custom user id (wrong-user-id vs custom-user-id', async () => {
            const protection = extras.generateProtections({ models: { userRole: {} } }, 'model-name-test')
            expect(
                await protection.filter({ state: { user: { id: 'user-id-1' } } }, { filter: [{ user_every: { id: 'wrong-user-id' } }] }, [{ name: 'user_every.id', value: 'custom-user-id' }], null),
            ).toBeFalsy()
        })

        it('should return TRUE because filter user.id is same custom user id (allowed custom-user-id', async () => {
            const protection = extras.generateProtections({ models: { userRole: {} } }, 'model-name-test')
            expect(
                await protection.filter({ state: { user: { id: 'user-id-1' } } }, { filter: [{ user_every: { id: 'custom-user-id' } }] }, [{ name: 'user_every.id', value: 'custom-user-id' }], null),
            ).toBeTruthy()
        })
    })

    describe('generateParentLogin', () => {
        let genPasswordAndTokensStub = jest.spyOn(extras, 'genPasswordAndTokens')

        afterEach(() => {
            mocked(genPasswordAndTokensStub).mockClear()
        })

        afterAll(() => {
            mocked(extras.genPasswordAndTokens).mockRestore()
        })

        it('should pass', async () => {
            const saveStub = jest.fn()
            const findOneStub = jest.fn().mockImplementation(() => ({
                token: '1',
                save: saveStub,
            }))
            const sendStub = jest.fn()
            const genPasswordAndTokensStub = jest.spyOn(extras, 'genPasswordAndTokens').mockImplementation(() => {})

            process.env.PARENT_ACCESS_TOKEN = '7674123'
            process.env.PARENT_ACCESS_USER_ID = '4321123'
            process.env.ADMIN_EMAIL = 'admin@email.com'
            const parentLogin = extras.generateParentLogin({
                models: {
                    user: {
                        findOne: findOneStub,
                    },
                },
            })

            const ctx = {
                params: {
                    parentAccessToken: '7674123',
                    parentUserId: '4321123',
                },
                body: null,
            }

            await parentLogin(ctx)

            expect(findOneStub).toBeCalledWith({ email: 'admin@email.com' })
            expect(genPasswordAndTokensStub).not.toBeCalled()
            expect(ctx.body).toEqual({ token: '1' })
        })

        it('should pass and generate new tokens', async () => {
            const saveStub = jest.fn()
            const findOneStub = jest.fn().mockResolvedValue({
                save: saveStub,
            })
            const sendStub = jest.fn()
            genPasswordAndTokensStub.mockImplementation((user) => {
                user.token = 'genPasswordAndTokensStub-token-1'
            })

            process.env.PARENT_ACCESS_TOKEN = '7674123'
            process.env.PARENT_ACCESS_USER_ID = '4321123'
            process.env.ADMIN_EMAIL = 'admin@email.com'

            const parentLogin = extras.generateParentLogin({
                models: {
                    user: {
                        findOne: findOneStub,
                    },
                },
            })

            const ctx = {
                params: {
                    parentAccessToken: '7674123',
                    parentUserId: '4321123',
                },
                body: null,
            }

            await parentLogin(ctx)

            expect(findOneStub).toBeCalledWith({ email: 'admin@email.com' })
            expect(genPasswordAndTokensStub).toBeCalled()
            expect(ctx.body).toEqual({ token: 'genPasswordAndTokensStub-token-1' })
        })

        it('should fail wrong parent access token', async () => {
            const saveStub = jest.fn()
            const findOneStub = jest.fn().mockImplementation(() => ({
                token: '1',
                save: saveStub,
            }))
            const sendStub = jest.fn()
            const genPasswordAndTokensStub = jest.spyOn(extras, 'genPasswordAndTokens').mockImplementation(() => {})

            process.env.PARENT_ACCESS_TOKEN = '123'
            process.env.ADMIN_EMAIL = 'admin@email.com'
            const parentLogin = extras.generateParentLogin({
                models: {
                    user: {
                        findOne: findOneStub,
                    },
                },
            })

            await expect(
                parentLogin({
                    params: { parentAccessToken: 'wrong123' },
                    send: sendStub,
                }),
            ).rejects.toEqual('Unknown parent access token')

            expect(findOneStub).not.toBeCalled()
            expect(genPasswordAndTokensStub).not.toBeCalled()
            expect(sendStub).not.toBeCalled()
        })

        it('should fail wrong access user id', async () => {
            const saveStub = jest.fn()
            const findOneStub = jest.fn().mockImplementation(() => ({
                token: '1',
                save: saveStub,
            }))
            const sendStub = jest.fn()
            const genPasswordAndTokensStub = jest.spyOn(extras, 'genPasswordAndTokens').mockImplementation(() => {})

            process.env.PARENT_ACCESS_TOKEN = '123'
            process.env.PARENT_ACCESS_USER_ID = '123'
            process.env.ADMIN_EMAIL = 'admin@email.com'
            const parentLogin = extras.generateParentLogin({
                models: {
                    user: {
                        findOne: findOneStub,
                    },
                },
            })

            await expect(
                parentLogin({
                    params: {
                        parentAccessToken: '123',
                        parentUserId: 'wrong123',
                    },
                    send: sendStub,
                }),
            ).rejects.toEqual('Unknown parent access token')

            expect(findOneStub).not.toBeCalled()
            expect(genPasswordAndTokensStub).not.toBeCalled()
            expect(sendStub).not.toBeCalled()
        })
    })

    describe('checkDataContainProtectedFields', () => {
        it('should pass no issues with checkDataContainProtectedFields', () => {
            const found = extras.checkDataContainProtectedFields({
                name: 'name1',
                personal: {
                    year: 2001,
                    contacts: {
                        tel: 'phone-number',
                    },
                },
            })

            expect(found).toHaveLength(0)
        })

        it('should pass no issues with checkDataContainProtectedFields', () => {
            const found = extras.checkDataContainProtectedFields({
                name: 'name1',
                __private: 3,
                __private_text: 'who ho ho',
                personal: {
                    year: 2001,
                    __unreachable: 'also not editable',
                    contacts: {
                        tel: 'phone-number',
                        __connect_code: 'also not editable',
                    },
                },
            })

            expect(found).toHaveLength(4)
            expect(found).toMatchSnapshot()
        })
    })
})
