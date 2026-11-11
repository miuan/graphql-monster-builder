import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import { exportAsFromString } from '../build'

import * as request from 'supertest'

// Each run and worker uses its own database; global teardown removes only recorded test databases.
export async function generateAndRunServerFromSchema(name: string, schema: string, dbname = 'test_integration_all') {
    let server
    let dropCollectionPromises = []

    const runId = process.env.GMB_TEST_RUN_ID || String(process.pid)
    const worker = process.env.JEST_WORKER_ID || '1'
    const integrationTestServerPath = path.resolve(`../__generated_servers_for_integration_test__/${runId}-${worker}/${name}`)

    await remakeServer(integrationTestServerPath, name, schema, `${dbname}_${runId}_${worker}`)

    const module = require(path.join(integrationTestServerPath, 'server'))
    server = await module.connectionPromise
    fs.appendFileSync(path.join(os.tmpdir(), `gmb-test-databases-${runId}.jsonl`), JSON.stringify({
        database: `${dbname}_${runId}_${worker}`, host: process.env.DB_HOST || '127.0.0.1',
    }) + '\n', { mode: 0o600 })

    const post = async (url, body: { query: string; variables: any }, token?: string) => {
        const req = request(server.koa).post(url).set('Content-Type', 'application/json').set('Accept', 'application/json')

        if (token) {
            req.set('Authorization', `Bearer ${token}`)
        }

        return await req.send(body)
    }

    const put = async (url, body: { query: string; variables: any }, token?: string) => {
        const req = request(server.koa).put(url).set('Content-Type', 'application/json').set('Accept', 'application/json')

        if (token) {
            req.set('Authorization', `Bearer ${token}`)
        }

        return await req.send(body)
    }

    const del = async (url, body: { query: string; variables: any }, token?: string) => {
        const req = request(server.koa).delete(url).set('Content-Type', 'application/json').set('Accept', 'application/json')

        if (token) {
            req.set('Authorization', `Bearer ${token}`)
        }

        return await req.send(body)
    }

    const get = async (url, token?: string) => {
        const req = request(server.koa).get(url).set('Content-Type', 'application/json').set('Accept', 'application/json')

        if (token) {
            req.set('Authorization', `Bearer ${token}`)
        }

        return await req.send()
    }

    const query = async (body, token?: string) => {
        return (await post('/graphql', body, token)).body
    }

    const mutate = async ({ mutation, variables }: { mutation: string; variables: any }, token?: string) => {
        return query({ query: mutation, variables }, token)
    }

    for (const modelName of Object.keys(await server.entry.models)) {
        await server.entry.models[modelName].deleteMany({})
    }

    // await new Promise((resolve) => setTimeout(resolve, 1000))
    // upload user again
    await module.updateAdminUser()

    const count = await server.entry.models.user.countDocuments({})

    return { ...server, query, mutate, get, post, put, delete: del, integrationTestServerPath }

}

async function remakeServer(integrationTestServerPath: string, name: string, schema: string, dbname: string) {
    fs.rmSync(integrationTestServerPath, { recursive: true, force: true })
    await exportAsFromString(name, schema, integrationTestServerPath, {
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
        `
JWT_TOKEN_SECRET=integration-tests-only-secret
ADMIN_EMAIL=admin@admin.test
ADMIN_PASSWORD=admin@admin.test
    `,
    )

    const serverPaht = path.join(integrationTestServerPath, 'server.ts')
    await replaceInFile(serverPaht, (data) => {
        return data
            .replace("'./gen/graphql.schema'", JSON.stringify(path.join(integrationTestServerPath, 'gen/graphql.schema')))
            .replace("path: './config/environment'", 'path: ' + JSON.stringify(envPath))
            .replace('const PORT = process.env.PORT || 3001', 'const PORT = 0')
            .replace("db: process.env.DB_NAME || 'db_graphql_monster'", 'db: ' + JSON.stringify(dbname))
    })
}

async function replaceInFile(file, replaceFn) {
    return new Promise((resolve) => {
        fs.readFile(file, 'utf8', function (err, data) {
            if (err) {
                return console.log(err)
            }

            const result = replaceFn(data) //data.replace(/string to be replaced/g, 'replacement')

            fs.writeFile(file, result, 'utf8', function (err) {
                if (err) return console.log(err)
                resolve(null)
            })
        })
    })
}

export async function disconnectFromServer(server: any) {
    if (!server) return
    await server.apollo.stop()
    await new Promise<void>((resolve, reject) => server.koa.close(error => error ? reject(error) : resolve()))
    await server.mongoDB.close()
    fs.rmSync(server.integrationTestServerPath, { recursive: true, force: true })
    console.log('server closed!')
}

export function loadGraphQL(fileName) {
    let file = fs.readFileSync(fileName).toString()
    if (file.startsWith('#import "')) {
        let fragment = '',
            fragment2 = ''
        const match = file.match(/#import "(.*?)"/)
        if (match?.length > 0) {
            const fragmenName = path.join(path.dirname(fileName), match[1])
            fragment = fs.readFileSync(fragmenName).toString()

            const match2 = fragment.match(/#import "(.*?)"/)
            if (match2?.length > 0) {
                const fragmenName2 = path.join(path.dirname(fileName), match2[1])
                fragment2 = fs.readFileSync(fragmenName2).toString()
            }
        }

        file = `
            ${fragment2}
            ${fragment}

            ${file}
        `
    }

    const ql = file //gql(file);
    return ql
}

export function jsonWithoutCircularStructure(circularJSON) {
    const replacerFunc = () => {
        const listOfObject = []
        return (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (listOfObject.includes(value)) {
                    return
                }
                listOfObject.push(value)
            }
            return value
        }
    }

    return JSON.parse(JSON.stringify(circularJSON, replacerFunc()))
}
