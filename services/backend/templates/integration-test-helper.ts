import * as path from 'path'
import * as request from 'supertest'
import * as mongoose from 'mongoose'

export async function connectToServer() {
    let server
    try {
        const module = require(path.join('../../', 'server'))
        server = await module.connectionPromise

        // NOTE:
        //    createTestClient - skip the requeste layer and skip the header part
        //    https://github.com/apollographql/apollo-server/issues/2277
        // const { query, mutate } = createTestClient(server.apollo)

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
            await server.entry.models[modelName].remove({})
        }

        // await new Promise((resolve) => setTimeout(resolve, 1000))
        // upload user again
        await module.updateAdminUser(true)

        const count = await server.entry.models.user.count({})

        return { ...server, query, mutate, get, post, put, delete: del }
    } catch (ex) {
        console.error(ex)
    }
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
