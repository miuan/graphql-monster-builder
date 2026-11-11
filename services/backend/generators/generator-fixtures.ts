import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { getModelsFromSchema } from '../../parser/scan'
import { createService } from './service'
import { createResolver } from './resolvers'
import { SchemaModel } from '../../common/types'

const lowerFirst = (name: string) => name[0].toLowerCase() + name.slice(1)

export const createGeneratedFixture = (model: SchemaModel, kind: 'service' | 'resolver') => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gmb-unit-'))
    fs.mkdirSync(path.join(directory, 'models'))
    fs.mkdirSync(path.join(directory, 'modules'))
    fs.writeFileSync(path.join(directory, 'extras.ts'), `export * from ${JSON.stringify(path.resolve('services/backend/templates/extras'))}`)
    fs.writeFileSync(path.join(directory, 'api-utils.ts'), `export * from ${JSON.stringify(path.resolve('services/backend/templates/api/api-utils.t'))}`)
    const lower = lowerFirst(model.modelName)
    fs.writeFileSync(
        path.join(directory, 'models', model.modelName + '.ts'),
        `
        export const temporaryId = { toString: () => 'temporary-id' }
        export const Types = { ObjectId: jest.fn().mockImplementation(() => temporaryId) }
        export const ${lower}Model = {
            create: jest.fn(), findByIdAndUpdate: jest.fn(), findByIdAndDelete: jest.fn(),
            findById: jest.fn(), find: jest.fn(), countDocuments: jest.fn(), updateMany: jest.fn(),
        }
    `,
    )
    const file = path.join(directory, 'modules', model.modelName + '.ts')
    fs.writeFileSync(file, kind === 'service' ? createService(model) : createResolver(model))
    const module = require(file)
    const database = require(path.join(directory, 'models', model.modelName + '.ts'))
    return { module, model: database[lower + 'Model'], temporaryId: database.temporaryId, lower, dispose: () => fs.rmSync(directory, { recursive: true, force: true }) }
}

export const createRelationFixture = (many: boolean, inverseMany: boolean, required: boolean) => {
    const relation = (field: string, isMany: boolean, isRequired: boolean) => `${field}: ${isMany ? '[' : ''}@relation(name: "Pair")${isMany ? ']' : ''}${isRequired ? '!' : ''}`
    const models = getModelsFromSchema(`
        type Main @model {
            name: String
            ${relation('related', many, false)}
        }
        type Related @model {
            name: String
            ${relation('main', inverseMany, required)}
        }
    `)
    const main = models.find((model) => model.modelName === 'Main')
    const fixture = createGeneratedFixture(main, 'service')
    const entry = { hooks: { services: {} }, models: {}, services: {} } as any
    for (const model of models) {
        const key = lowerFirst(model.modelName)
        entry.models[key] = { updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }), find: jest.fn().mockResolvedValue([]) }
        entry.services[key] = { create: jest.fn(), remove: jest.fn() }
    }
    const service = fixture.module.generateMainService(entry)
    return { ...fixture, entry, service, related: entry.models.related, relatedService: entry.services.related }
}
