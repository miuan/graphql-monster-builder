import * as fs from 'fs'
import * as service from '../generators/service'
import * as _ from 'lodash'
import * as path from 'path'
import * as bcrypt from 'bcrypt'
import { SchemaModelRelationType } from '../../common/types'
import { exportAsFromString } from '../build'
import { createTestClient } from 'apollo-server-testing'
import gql from 'graphql-tag'
import * as mongoose from 'mongoose'

import * as request from 'supertest'

export const TEST_DIR = 'templates/__generated_services_for_test__'
const SERVICE_BACKEND = './services/backend/'
export const testDirFullPath = `${SERVICE_BACKEND}${TEST_DIR}`

export function prepareDirectories() {
    if (!fs.existsSync(testDirFullPath)) {
        fs.mkdirSync(testDirFullPath)
    }

    if (!fs.existsSync(`${testDirFullPath}/services`)) {
        fs.mkdirSync(`${testDirFullPath}/services`)
    }

    if (!fs.existsSync(`${testDirFullPath}/models`)) {
        fs.mkdirSync(`${testDirFullPath}/models`)
    }

    //if(!fs.existsSync(`${testDirFullPath}/extras.ts`)){
    fs.writeFileSync(
        `${testDirFullPath}/extras.ts`,
        `
export const filterGen = jest.fn()
export default filterGen
`,
    )
}

export const createService = (model) => {
    const created = service.createService(model)
    const camelName = _.camelCase(model.modelName)
    fs.writeFileSync(`${testDirFullPath}/services/${camelName}Service.ts`, created)
    fs.writeFileSync(
        `${testDirFullPath}/models/${camelName}.ts`,
        `export const ${camelName}Model = {
        create: jest.fn(), //.mockImplementation(async (data)=>data),
        findByIdAndUpdate: jest.fn(), //.mockImplementation(async (id, data)=>data),
        findByIdAndRemove: jest.fn() //.mockImplementation(async (data)=>data),
    } as any;
    export const Types = {ObjectId: jest.fn().mockImplementation(()=>'random-id')}
    export default ${camelName}Model`,
    )

    try {
        const service = require(`../${TEST_DIR}/services/${camelName}Service.ts`)
        const model = require(`../${TEST_DIR}/models/${camelName}.ts`)[`${camelName}Model`]
        return {
            service,
            model,
            mockClearToAll: () => {
                model.create.mockClear()
                model.findByIdAndUpdate.mockClear()
                model.findByIdAndRemove.mockClear()
            },
        }
    } catch (ex) {
        console.error(ex)
        throw ex
    }
}

export function createServiceWithRelation(meType, required) {
    let relationService
    const modelName = _.camelCase(`Relation ${meType} ${required} `)
    const memberWeWithRelationOthers = {
        name: 'toThem',
        relation: {
            name: 'WeConnectToOthers',
            isRequired: false,
            type: meType,
            relatedModel: {
                modelName: 'ModelWithOthers',
                members: [
                    {
                        name: 'backToMe',
                        isRequired: required === 'required',
                        relation: {
                            name: 'WeConnectToOthers',
                            type: meType,
                        },
                    },
                ],
            },
        },
    }

    const updateMany = jest.fn()
    const findOne = jest.fn()
    const remove = jest.fn()
    const create = jest.fn()

    const entry = {
        hooks: { services: {} },
        services: {
            modelWithOthers: {
                create,
                remove,
            },
        },
        models: {
            modelWithOthers: {
                findOne,
                updateMany,
            },
        },
    }
    relationService = createService({ modelName, members: [memberWeWithRelationOthers] })
    // relationService.model.findByIdAndUpdate.mockResolvedValue({id: 'resolved-findByIdAndUpdate-id-1'})

    const creatGen = relationService.service[`${modelName}Create`]
    // expect(creatGen).toBeFunction()

    const createFn = creatGen(entry)
    //  expect(createFn).toBeFunction()

    const updateGen = relationService.service[`${modelName}Update`]
    // expect(updateGen).toBeFunction()

    const updateFn = updateGen(entry)
    // expect(updateFn).toBeFunction()

    const removeGen = relationService.service[`${modelName}Remove`]
    // expect(removeGen).toBeFunction()

    const removeFn = removeGen(entry)
    // expect(removeFn).toBeFunction()

    return {
        service: relationService,
        entry,
        updateFn,
        createFn,
        removeFn,
        mockClearToAll: () => {
            relationService.mockClearToAll()

            create.mockClear()
            findOne.mockClear()
            updateMany.mockClear()

            remove.mockClear()
        },
    }
}

// export function reverseType(meType){
//     if(meType == SchemaModelRelationType.MANY_TO_MANY) return SchemaModelRelationType.MANY_TO_MANY
//     if(meType == SchemaModelRelationType.MANY_TO_ONE) return SchemaModelRelationType.ONE_TO_MANY
//     if(meType == SchemaModelRelationType.ONE_TO_MANY) return SchemaModelRelationType.MANY_TO_ONE
//     else return SchemaModelRelationType.ONE_TO_ONE
// }

export async function generateAndRunServerFromSchema(name: string, schema: string, port = 3001) {
    let server

    const integrationTestServerPath = path.resolve(`../__generated_servers_for_integration_test__/${name}`)

    await remakeServer(integrationTestServerPath, name, schema, port)

    try {
        const module = require(path.join(integrationTestServerPath, 'server'))
        server = await module.connectionPromise

        // NOTE:
        //    createTestClient - skip the requeste layer and skip the header part
        //    https://github.com/apollographql/apollo-server/issues/2277
        // const { query, mutate } = createTestClient(server.apollo)

        const query = async (body: { query: string; variables: any }, token?: string) => {
            const req = request(server.koa)
                .post('/graphql')
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')

            if (token) {
                req.set('Authorization', `Bearer ${token}`)
            }

            return (await req.send(body)).body
        }

        const mutate = async ({ mutation, variables }: { mutation: string; variables: any }, token?: string) => {
            return query({ query: mutation, variables }, token)
        }

        // console.log(server)
        let dropCollectionPromises = []
        await new Promise((resolve1) => {
            mongoose.connection.db.listCollections().toArray((err, collectionNames) => {
                const myCollections = collectionNames.filter((collectionName) => collectionName.name.startsWith(name))
                dropCollectionPromises = myCollections.map(
                    (collectionName) =>
                        new Promise((resolve, reject) => {
                            mongoose.connection.db.dropCollection(collectionName.name, (err) => {
                                resolve(1)
                            })
                        }),
                )

                resolve1(1)
            })
        })

        await Promise.all(dropCollectionPromises)
        // upload user again
        await module.updateAdminUser(true)

        return { ...server, query, mutate }
    } catch (ex) {
        console.error(ex)
    }
}

async function remakeServer(integrationTestServerPath: string, name: string, schema: string, port: number) {
    fs.rmdirSync(integrationTestServerPath, { recursive: true })
    await exportAsFromString(name, schema, integrationTestServerPath, {
        server: {
            config: {
                "./gen/graphql.schema'": `../__generated_servers_for_integration_test__/${name}/gen/graphql.schema'`,
                "path: './config/environment'": `path: '../__generated_servers_for_integration_test__/${name}/config/environment'`,
            },
        },
        extras: {
            config: { "from './sendMail'": "from '../services/sendMail'" },
        },
    })

    const modules = path.resolve(`./node_modules`)

    fs.symlinkSync(modules, path.join(integrationTestServerPath, 'node_modules'))

    const envPath = path.join(integrationTestServerPath, 'config/environment/')
    fs.mkdirSync(envPath, { recursive: true })
    fs.writeFileSync(
        path.join(envPath, '.env'),
        `PORT=${port}
ADMIN_EMAIL=admin1
ADMIN_PASSWORD=${bcrypt.hashSync('admin1', 1)}
    `
    )
}

export async function disconnectFromServer(server: any) {
    await server.koa.close()
    await new Promise((resolve, reject) => {
        server.mongoDB.close(() => {
            resolve(1)
        })
    })
    console.log('server closed!')
}

export function loadGraphQL(fileName) {
    let file = fs.readFileSync(fileName).toString()
    if (file.startsWith('#import "')) {
        const match = file.match(/#import "(.*?)"/)
        const fragmenName = path.join(path.dirname(fileName), match[1])
        const fragment = fs.readFileSync(fragmenName).toString()
        file = `
            ${fragment}

            ${file}
        `
    }

    const ql = file //gql(file);
    return ql
}
