import * as path from 'path'
import * as request from 'supertest'
import * as mongoose from 'mongoose'

export async function connectToServer(){
    try {
        const module = require(path.join('./', 'server'))
        const server = await module.connectionPromise
        

        // NOTE: 
        //    createTestClient - skip the requeste layer and skip the header part
        //    https://github.com/apollographql/apollo-server/issues/2277
        // const { query, mutate } = createTestClient(server.apollo)

        const query = async (body: {query:string, variables: any}, token?: string) => {
            const req = request(server.koa)
                .post('/graphql')
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')

            if(token){
                req.set('Authorization', `Bearer ${token}`)
            }

            return (await req.send(body)).body
        }
        
        const mutate = async ({mutation, variables}: {mutation:string, variables: any}, token?: string) => {
            return query({query: mutation, variables}, token)
        }

        // console.log(server)
        let dropCollectionPromises = []
        await new Promise((resolve1)=>{
            mongoose.connection.db.listCollections().toArray((err, collectionNames) => {
                const myCollections = collectionNames.filter((collectionName)=>collectionName.name.startsWith(name))
                dropCollectionPromises = myCollections.map((collectionName)=>new Promise((resolve, reject)=>{
                    mongoose.connection.db.dropCollection(collectionName.name, (err)=>{
                        resolve(1)
                    })
                }))

                resolve1(1)
            })
        })

        await Promise.all(dropCollectionPromises)
        // upload user again
        await module.updateAdminUser(true)

    return {...server, query, mutate}
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
