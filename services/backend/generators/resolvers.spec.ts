import 'jest-extended'
import * as fs from 'fs'
import { SchemaModel, SchemaModelProtection, SchemaModelProtectionType } from '../../common/types'
import * as resolvers from './resolvers'
import * as extras from '../templates/extras'

const TEST_DIR = 'templates/__generated_resolvers_for_test__'
const SERVICE_BACKEND = './services/backend/'

const genProtection = (protectionSetting) => ({
    all: [protectionSetting],
    one: [protectionSetting],
    create: [protectionSetting],
    update: [protectionSetting],
    remove: [protectionSetting],
})

const createProtectionMock = (pass, protectedFields = []) => {
    const protectionMock = {
        public: jest.fn().mockResolvedValue(pass),
        user: jest.fn().mockResolvedValue(pass),
        owner: jest.fn().mockResolvedValue(pass),
        role: jest.fn().mockResolvedValue(pass),
        filter: jest.fn().mockResolvedValue(pass),
        checkDataContainProtectedFields: jest.fn().mockReturnValue(protectedFields),
    }
    return protectionMock
}

const createCtxMock = (error = new Error(), userId = 'mockedUserId') => {
    const ctx = {
        userId,
    }

    ctx['throw'] = jest.fn().mockImplementation(() => {
        throw error
    })

    return ctx
}

const createEntryMock = (resolverName: string, method: string) => {
    const lowerMethod = method.toLowerCase()
    const entry = {
        hooks: {},
        services: {} as any,
    }
    entry.services[resolverName] = {}
    entry.services[resolverName][lowerMethod] = jest.fn().mockResolvedValue(`${lowerMethod}_output`)

    // entry.hooks[`beforetestResolver${method}`] = jest.fn().mockResolvedValue({beforeHookResponse: `${lowerMethod}_output`})
    // entry.hooks[`aftertestResolver${method}`] = jest.fn().mockResolvedValue({afterHookResponse: `${lowerMethod}_output`})

    return entry
}

describe.skip('resolver', () => {
    const testDirFullPath = `${SERVICE_BACKEND}${TEST_DIR}`

    let existsSyncMock
    let writeFileSyncMock

    let testResolverWithPublic
    beforeAll(() => {
        if (!fs.existsSync(testDirFullPath)) {
            fs.mkdirSync(testDirFullPath)
        }

        const resolver = resolvers.createResolver({
            modelName: `testResolverWithPublic`,
            protection: genProtection({ type: SchemaModelProtectionType.PUBLIC }),
            members: [],
        } as SchemaModel)
        fs.writeFileSync(`${testDirFullPath}/testResolverWithPublic.ts`, resolver)
        testResolverWithPublic = require(`../${TEST_DIR}/testResolverWithPublic.ts`)
    })

    beforeEach(() => {})

    afterAll(() => {
        fs.rmdirSync(testDirFullPath)
    })

    describe.each([['Create'], ['Update']])('checkDataContainProtectedFields in %s ', (method) => {
        it('should fail because contain some protected', async () => {
            const error = new Error('Unauthorized error')
            const lowerMethod = method.toLowerCase()
            const ctxMock = createCtxMock(error)
            const entry = createEntryMock('testResolverWithPublic', method)
            const protectionMock = createProtectionMock(
                true,
                [{ name: '__field1', path: '/' }], // data have one protected field __field1
            )
            const dataMock = { data: 'simple data' }

            const methodFn = testResolverWithPublic[`testResolverWithPublic${method}`](entry, protectionMock)

            let result
            let exception
            try {
                result = await methodFn(null, dataMock, ctxMock)
            } catch (ex) {
                exception = ex
            }

            expect(protectionMock.checkDataContainProtectedFields).toBeCalledTimes(1)
            expect(protectionMock.checkDataContainProtectedFields).toHaveBeenCalledAfter(protectionMock.public)
            expect(ctxMock['throw']).toBeCalled()
            expect(ctxMock['throw']).toBeCalledWith(403, {
                type: 'ReachProtectedFields',
                presentProtectedFields: [{ name: '__field1', path: '/' }],
                message: 'Trying to update protected fields, which they are just read only',
            })
            expect(exception).toEqual(error)
            expect(result).not.toBeDefined()
        })

        it('should pass because Not contain any protected', async () => {
            const error = new Error('Unauthorized error')
            const lowerMethod = method.toLowerCase()
            const ctxMock = createCtxMock(error)
            const entry = createEntryMock('testResolverWithPublic', method)
            const protectionMock = createProtectionMock(
                true,
                [], // data doesn't have any protected content
            )
            const dataMock = { data: 'simple data' }

            const methodFn = testResolverWithPublic[`testResolverWithPublic${method}`](entry, protectionMock)

            let result
            let exception
            try {
                result = await methodFn(null, dataMock, ctxMock)
            } catch (ex) {
                exception = ex
            }

            expect(protectionMock.checkDataContainProtectedFields).toBeCalledTimes(1)
            expect(protectionMock.checkDataContainProtectedFields).toHaveBeenCalledAfter(protectionMock.public)
            expect(ctxMock['throw']).not.toBeCalled()
            expect(exception).not.toBeDefined()
            expect(result).toEqual(`${method.toLocaleLowerCase()}_output`)
        })
    })

    function protectionExpectPublic(protectionMock, ctxMock, mockData) {
        expect(protectionMock.public).toBeCalled()
    }

    function protectionExpectUser(protectionMock, ctxMock, mockData) {
        expect(protectionMock.user).toBeCalled()
        expect(protectionMock.user).toBeCalledWith(ctxMock)
    }

    function protectionExpectOwner(protectionMock, ctxMock, mockData) {
        expect(protectionMock.owner).toBeCalled()
        expect(protectionMock.owner).toBeCalledWith(ctxMock, mockData, 'user')
    }

    function protectionExpectRole(protectionMock, ctxMock, mockData) {
        expect(protectionMock.role).toBeCalled()
        expect(protectionMock.role).toBeCalledWith(ctxMock, ['Admin'])
    }

    function protectionExpectFilter(protectionMock, ctxMock, mockData) {
        expect(protectionMock.filter).toBeCalled()
        expect(protectionMock.filter).toBeCalledWith(ctxMock, mockData, [{ name: 'user', value: '{{userId}}' }], ['Admin'])
    }

    describe.each([
        ['public', { type: SchemaModelProtectionType.PUBLIC }, protectionExpectPublic],
        ['user', { type: SchemaModelProtectionType.USER }, protectionExpectUser],
        ['owner', { type: SchemaModelProtectionType.OWNER }, protectionExpectOwner],
        ['role', { type: SchemaModelProtectionType.ROLE, roles: ['Admin'] }, protectionExpectRole],
        [
            'filter',
            {
                type: SchemaModelProtectionType.FILTER,
                roles: ['Admin'],
                filter: [{ name: 'user', value: '{{userId}}' }],
            },
            protectionExpectFilter,
        ],
    ])('Allow for %s', (type, protectionSetting, proctectionExpect) => {
        const name = `testResolver_${type}`
        let testResolver

        beforeAll(() => {
            const resolver = resolvers.createResolver({
                modelName: `testResolver`,
                protection: genProtection(protectionSetting),
                members: [],
            } as SchemaModel)
            fs.writeFileSync(`${testDirFullPath}/${name}.ts`, resolver)
            testResolver = require(`../${TEST_DIR}/${name}.ts`)
        })

        it.each([['All'], ['One'], ['Create'], ['Update'], ['Remove']])('not pass data for method %s because unauthorized', async (method) => {
            const error = new Error('Unauthorized error')
            const lowerMethod = method.toLowerCase()
            const ctxMock = createCtxMock(error)
            const entry = createEntryMock('testResolver', method)
            const protectionMock = createProtectionMock(false)
            const dataMock = { data: 'simple data' }

            const methodFn = testResolver[`testResolver${method}`](entry, protectionMock)

            let result
            let exception
            try {
                result = await methodFn(null, dataMock, ctxMock)
            } catch (ex) {
                exception = ex
            }

            expect(ctxMock['throw']).toBeCalled()
            expect(ctxMock['throw']).toBeCalledWith(401, 'Unauthorized')
            expect(exception).toEqual(error)
            expect(result).not.toBeDefined()

            proctectionExpect(protectionMock, ctxMock, dataMock)
        })

        it.each([['All'], ['One'], ['Create'], ['Update'], ['Remove']])('pass data for method: %s', async (method) => {
            const error = new Error('Unauthorized error')
            const lowerMethod = method.toLowerCase()
            const ctxMock = createCtxMock(error)
            const entryMock = createEntryMock('testResolver', method)
            const protectionMock = createProtectionMock(true)
            const dataMock = { data: 'simple data', id: 'test-mock-id' }
            const methodFn = testResolver[`testResolver${method}`](entryMock, protectionMock)

            let result
            let exception
            try {
                result = await methodFn(null, dataMock, ctxMock)
            } catch (ex) {
                exception = ex
            }

            expect(ctxMock['throw']).not.toBeCalled()
            expect(exception).not.toBeDefined()

            if (method === 'All') {
                expect(entryMock.services.testResolver['all']).toBeCalled()
                expect(entryMock.services.testResolver['all']).toBeCalledWith(dataMock, ctxMock.userId)
            } else if (method === 'One') {
                expect(entryMock.services.testResolver['one']).toBeCalled()
                expect(entryMock.services.testResolver['one']).toBeCalledWith(dataMock.id)
            } else if (method === 'Create') {
                expect(entryMock.services.testResolver['create']).toBeCalled()
                expect(entryMock.services.testResolver['create']).toBeCalledWith(dataMock, ctxMock.userId)
            } else if (method === 'Update') {
                expect(entryMock.services.testResolver['update']).toBeCalled()
                expect(entryMock.services.testResolver['update']).toBeCalledWith(dataMock, null, ctxMock.userId)
            } else if (method === 'Remove') {
                expect(entryMock.services.testResolver['remove']).toBeCalled()
                expect(entryMock.services.testResolver['remove']).toBeCalledWith(dataMock.id, ctxMock.userId)
            }

            expect(result).toEqual(`${lowerMethod}_output`)
        })

        // TODO: pass data with hooks
        it.todo('pass data for method: All, One, Create, Update, Remove with hooks')
    })
})
