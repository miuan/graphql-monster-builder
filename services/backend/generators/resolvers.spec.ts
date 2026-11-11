import { getModelsFromSchema } from '../../parser/scan'
import { SchemaModelProtectionType } from '../../common/types'
import { createGeneratedFixture } from './generator-fixtures'

const operations = ['All', 'Count', 'One', 'Create', 'Update', 'Remove'] as const
const settings = [
    ['public', { type: SchemaModelProtectionType.PUBLIC }],
    ['user', { type: SchemaModelProtectionType.USER }],
    ['owner', { type: SchemaModelProtectionType.OWNER }],
    ['role', { type: SchemaModelProtectionType.ROLE, roles: ['Admin'] }],
    ['filter', { type: SchemaModelProtectionType.FILTER, roles: ['Admin'], filter: [{ name: 'user.id', value: '{{userId}}' }] }],
] as const

const createContext = () => ({
    state: { user: { id: 'actor-id' } },
    throw: jest.fn((status, data) => {
        throw Object.assign(new Error(data.message), { status, ...data })
    }),
})
const createEntry = () => ({
    hooks: { resolvers: {} as any },
    services: {
        testResolver: {
            all: jest.fn().mockResolvedValue([{ _id: 'record-id' }]),
            count: jest.fn().mockResolvedValue(1),
            one: jest.fn().mockResolvedValue({ id: 'record-id' }),
            create: jest.fn().mockResolvedValue({ id: 'record-id' }),
            update: jest.fn().mockResolvedValue({ id: 'record-id' }),
            remove: jest.fn().mockResolvedValue({ id: 'record-id' }),
        },
    },
})

describe.each(settings)('generated resolvers protected by %s', (kind, setting) => {
    let fixture: ReturnType<typeof createGeneratedFixture>
    let protections: any
    beforeAll(() => {
        const model = getModelsFromSchema('type TestResolver @model {\nname: String\n}').find((model) => model.modelName === 'TestResolver')
        model.protection = Object.fromEntries(['all', 'one', 'create', 'update', 'remove'].map((action) => [action, [setting]])) as any
        fixture = createGeneratedFixture(model, 'resolver')
    })
    afterAll(() => {
        fixture.dispose()
    })
    beforeEach(() => {
        protections = Object.fromEntries(['public', 'user', 'owner', 'role', 'filter'].map((name) => [name, jest.fn().mockResolvedValue(false)]))
        protections.checkDataContainProtectedFields = jest.fn().mockReturnValue([])
    })

    it.each(operations)('blocks %s before touching its service when authorization fails', async (operation) => {
        const entry = createEntry()
        const context = createContext()
        const resolver = fixture.module['testResolver' + operation](entry, protections)
        await expect(resolver(null, { id: 'record-id' }, context)).rejects.toMatchObject({ name: 'Unauthorized', status: 401 })
        expect(protections[kind]).toHaveBeenCalledTimes(1)
        expect(entry.services.testResolver[operation.toLowerCase()]).not.toHaveBeenCalled()
    })

    it.each(operations)('executes %s only after authorization and forwards the actual Koa user', async (operation) => {
        protections[kind].mockResolvedValue(true)
        const entry = createEntry()
        const context = createContext()
        const data = { id: 'record-id', name: 'example' }
        const service = entry.services.testResolver[operation.toLowerCase()]
        const result = await fixture.module['testResolver' + operation](entry, protections)(null, data, context)
        expect(protections[kind].mock.invocationCallOrder[0]).toBeLessThan(service.mock.invocationCallOrder[0])
        if (kind === 'user') expect(protections.user).toHaveBeenCalledWith(context)
        if (kind === 'owner') expect(protections.owner).toHaveBeenCalledWith(context, data, 'user')
        if (kind === 'role') expect(protections.role).toHaveBeenCalledWith(context, ['Admin'])
        if (kind === 'filter') expect(protections.filter).toHaveBeenCalledWith(context, data, [{ name: 'user.id', value: '{{userId}}' }], ['Admin'])
        if (operation === 'One') expect(service).toHaveBeenCalledWith(data.id)
        else if (operation === 'Remove') expect(service).toHaveBeenCalledWith(data.id, 'actor-id')
        else if (operation === 'Update') expect(service).toHaveBeenCalledWith(data, null, 'actor-id')
        else expect(service).toHaveBeenCalledWith(data, 'actor-id')
        if (operation === 'All') expect(result).toEqual([{ _id: 'record-id', id: 'record-id' }])
        else if (operation === 'Count') expect(result).toBe(1)
        else expect(result).toEqual({ id: 'record-id' })
    })

    if (kind === 'public') {
        it.each(['Create', 'Update'])('rejects protected input fields for %s', async (operation) => {
            protections.public.mockResolvedValue(true)
            protections.checkDataContainProtectedFields.mockReturnValue([{ name: '__password', path: '/' }])
            const entry = createEntry()
            const context = createContext()
            await expect(fixture.module['testResolver' + operation](entry, protections)(null, { __password: 'forbidden' }, context)).rejects.toMatchObject({
                status: 403,
                type: 'ReachProtectedFields',
                presentProtectedFields: [{ name: '__password', path: '/' }],
            })
            expect(entry.services.testResolver[operation.toLowerCase()]).not.toHaveBeenCalled()
        })

        it.each(operations)('runs before and after hooks in order for %s', async (operation) => {
            protections.public.mockResolvedValue(true)
            const entry = createEntry()
            const context = createContext()
            const before = jest.fn(async (_entry, { data }) => ({ ...data, name: 'from-hook' }))
            const after = jest.fn().mockResolvedValue('after-hook-result')
            entry.hooks.resolvers['beforeTestResolver' + operation] = before
            entry.hooks.resolvers['afterTestResolver' + operation] = after
            const result = await fixture.module['testResolver' + operation](entry, protections)(null, { id: 'record-id' }, context)
            const service = entry.services.testResolver[operation.toLowerCase()]
            expect(before).toHaveBeenCalledWith(entry, expect.objectContaining({ ctx: context }))
            expect(before.mock.invocationCallOrder[0]).toBeLessThan(service.mock.invocationCallOrder[0])
            expect(after.mock.invocationCallOrder[0]).toBeGreaterThan(service.mock.invocationCallOrder[0])
            if (operation === 'Create' || operation === 'Update') expect(service.mock.calls[0][0].name).toBe('from-hook')
            expect(result).toBe('after-hook-result')
        })
    }
})
