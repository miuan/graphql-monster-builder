import { getModelsFromSchema } from '../../parser/scan'
import { generateProtections } from '../templates/extras'
import { createGeneratedFixture } from './generator-fixtures'

const levels = ['admin', 'user', 'public'] as const
const combinations = levels.flatMap((create) => levels.flatMap((update) => levels.flatMap((remove) => levels.flatMap((one) => levels.map((all) => ({ create, update, remove, one, all }))))))

// Replace the old empty "heavy" tests with real authorization checks on emitted code.
// HTTP/database behavior remains covered by protection.integration.spec.ts.
describe('cross-operation protection matrix', () => {
    it.each(combinations)('enforces create=$create update=$update remove=$remove one=$one all=$all independently', async (configuration) => {
        const annotations = Object.entries(configuration)
            .map(([action, level]) => `@${action}(${level === 'admin' ? 'role:"admin"' : JSON.stringify(level)})`)
            .join('\n')
        const model = getModelsFromSchema(`${annotations}\ntype Matrix @model {\nname: String\n}`).find((model) => model.modelName === 'Matrix')
        const fixture = createGeneratedFixture(model, 'resolver')
        try {
            for (const actor of ['admin', 'regular', undefined]) {
                const context = { state: { user: actor ? { id: actor } : undefined } }
                const services = {
                    all: jest.fn().mockResolvedValue([{ _id: 'record-id' }]),
                    count: jest.fn().mockResolvedValue(1),
                    one: jest.fn().mockResolvedValue({ id: 'record-id' }),
                    create: jest.fn().mockResolvedValue({ id: 'record-id' }),
                    update: jest.fn().mockResolvedValue({ id: 'record-id' }),
                    remove: jest.fn().mockResolvedValue({ id: 'record-id' }),
                }
                const entry = {
                    hooks: { resolvers: {} },
                    services: { matrix: services },
                    models: {
                        userRole: { exists: jest.fn((query) => Promise.resolve(query.name === 'admin' && query.users === 'admin')) },
                    },
                }
                const protections = generateProtections(entry, 'matrix')
                for (const action of ['create', 'update', 'remove', 'one', 'all', 'count'] as const) {
                    const level = configuration[action === 'count' ? 'all' : action]
                    const allowed = level === 'public' || actor === 'admin' || (level === 'user' && actor === 'regular')
                    const name = 'matrix' + action[0].toUpperCase() + action.slice(1)
                    const resolver = fixture.module[name](entry, protections)
                    const result = resolver(null, { id: 'record-id', name: 'example' }, context)
                    if (allowed) {
                        await expect(result).resolves.toBeDefined()
                        expect(services[action]).toHaveBeenCalledTimes(1)
                    } else {
                        await expect(result).rejects.toMatchObject({ status: 401 })
                        expect(services[action]).not.toHaveBeenCalled()
                    }
                }
            }
        } finally {
            fixture.dispose()
        }
    })
})
