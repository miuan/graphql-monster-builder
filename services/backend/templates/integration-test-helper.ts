import * as path from 'path'
import * as request from 'supertest'
import * as mongoose from 'mongoose'

export async function connectToServer() {
    let server
    try {
        const module = require(path.join('../../', 'server'))
        server = await module.connectionPromise

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

        return { ...server, query, mutate, get, post, put, delete: del }
    } catch (ex) {
        console.error(ex)
    }
}

export async function disconnectFromServer(server: any) {
    await server.apollo.stop()
    await new Promise<void>((resolve, reject) => server.koa.close(error => error ? reject(error) : resolve()))
    await server.mongoDB.close()
    console.log('server closed!')
}
