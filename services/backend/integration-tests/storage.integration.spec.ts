import * as request from 'supertest'
import { disconnectFromServer, generateAndRunServerFromSchema, loadGraphQL } from './utils'
import * as fs from 'fs'

describe('storage integration', () => {
    let server
    let res

    beforeAll(async () => {
        server = await generateAndRunServerFromSchema(
            'storage',
            `
            @create("user")
                type File @model {
                    
                }
            `,
            3004,
        )

        const loginQL = loadGraphQL('./services/backend/integration-tests/graphql/login/login.gql')

        res = await server.mutate({
            mutation: loginQL,
            variables: {
                email: 'admin1',
                pass: 'admin1',
            },
        })

        expect(res).toHaveProperty('data.login_v1.token')
        expect(res).toHaveProperty('data.login_v1.refreshToken')
        expect(res).toHaveProperty('data.login_v1.user.id')
        expect(res).toHaveProperty('data.login_v1.user.email', 'admin1')
        expect(res).toHaveProperty('data.login_v1.user.roles', [{ name: 'admin' }])
        expect(res).not.toHaveProperty('errors')
    })

    afterAll(async () => {
        await disconnectFromServer(server)
        fs.rmdirSync('./file-storage/', { recursive: true })
    })

    it('createFile', async () => {
        const token = res.data.login_v1.token
        const modelFile = server.entry.models['file']

        const loadDataFromFileSpy = jest.spyOn(server.entry.storage, 'loadDataFromFile')

        const createModel1Mutation = `mutation File($name: String!,$data: String!, $userId:ID){
            createFile(name: $name,data: $data, userId:$userId) {
               id,name,type,size,publicKey,user{id}
            }
        }`

        const createModel1Response = await server.mutate(
            {
                mutation: createModel1Mutation,
                variables: {
                    name: 'File/name/xid52tc',
                    data: 'File/data/fgh47mk',
                    userId: res.data.login_v1.user.id,
                },
            },
            token,
        )

        const createFileRaw = await modelFile.findById(createModel1Response.data.createFile.id)
        const stat = fs.statSync(createFileRaw.__path)
        expect(stat).toBeDefined()
        expect(stat.size).toEqual(createFileRaw.size)

        const oneFileQuery = `query File($id: ID!){
            File(id: $id) {
                data,name,type,size,publicKey,id
            }
        }`

        const oneFileResponse = await server.query(
            {
                query: oneFileQuery,
                variables: { id: createModel1Response.data.createFile.id },
            },
            token,
        )

        expect(oneFileResponse).not.toHaveProperty('errors')
        expect(oneFileResponse).toHaveProperty('data.File.name', 'File/name/xid52tc')
        expect(oneFileResponse).toHaveProperty('data.File.data', 'File/data/fgh47mk')

        // the file content is corresponded to data
        const dataInFile = fs.readFileSync(createFileRaw.__path).toString()
        expect(dataInFile).toEqual('File/data/fgh47mk')

        // test load data is not call
        const oneFileQuery2 = `query File($id: ID!){
            File(id: $id) {
                name,type,size,publicKey,id
            }
        }`

        const oneFileResponse2 = await server.query(
            {
                query: oneFileQuery2,
                variables: { id: createModel1Response.data.createFile.id },
            },
            token,
        )

        expect(oneFileResponse2).not.toHaveProperty('errors')
        expect(oneFileResponse2).toHaveProperty('data.File.name', 'File/name/xid52tc')
        expect(oneFileResponse2).not.toHaveProperty('data.File.data')

        expect(loadDataFromFileSpy).toBeCalledTimes(1)

        const uploadJSON = oneFileResponse.data.File
        // download with public key
        const downloadRequestPublicKey = await request(server.koa).get('/download/' + uploadJSON.publicKey)
        expect(downloadRequestPublicKey).toHaveProperty('ok', true)
        expect(downloadRequestPublicKey).toHaveProperty('text', 'File/data/fgh47mk')
        expect(downloadRequestPublicKey).toHaveProperty('headers.content-disposition', 'attachment; filename=File/name/xid52tc')
        expect(downloadRequestPublicKey).toHaveProperty('headers.content-type', 'text/plain')
        expect(downloadRequestPublicKey).toHaveProperty('headers.content-length', `${uploadJSON.size}`)

        // download with id WITH token
        const downloadRequestIdToken = await request(server.koa)
            .get('/download/' + uploadJSON.id)
            .set('Authorization', 'Bearer ' + token)
        expect(downloadRequestIdToken).toHaveProperty('ok', true)
        expect(downloadRequestIdToken).toHaveProperty('text', 'File/data/fgh47mk')
        expect(downloadRequestIdToken).toHaveProperty('headers.content-disposition', 'attachment; filename=File/name/xid52tc')
        expect(downloadRequestIdToken).toHaveProperty('headers.content-type', 'text/plain')
        expect(downloadRequestIdToken).toHaveProperty('headers.content-length', `${uploadJSON.size}`)

        // download with id without token
        const downloadRequestId = await request(server.koa).get('/download/' + uploadJSON.id)
        expect(downloadRequestId).toHaveProperty('ok', false)
        expect(downloadRequestId.body).toEqual(expect.objectContaining({ error: { message: 'Unauthorized' } }))

        loadDataFromFileSpy.mockRestore()
    })

    it('updateFile', async () => {
        const token = res.data.login_v1.token
        const modelFile = server.entry.models['file']

        const createModel1Mutation = `mutation File($name: String!,$data: String!, $userId:ID){
            createFile(name: $name,data: $data, userId:$userId) {
               id,name,type,size,publicKey,user{id}
            }
        }`

        const createModel1Response = await server.mutate(
            {
                mutation: createModel1Mutation,
                variables: {
                    name: 'File/name/23rtytc',
                    data: 'File/data/89oplmk',
                    userId: res.data.login_v1.user.id,
                },
            },
            token,
        )

        const createFileRaw = await modelFile.findById(createModel1Response.data.createFile.id)
        const stat1 = fs.statSync(createFileRaw.__path)
        expect(stat1).toBeDefined()
        expect(stat1.size).toEqual(createFileRaw.size)

        const updateFileMutation = `mutation updateFile($id:ID!, $name: String,$data: String!){
            updateFile(id:$id, name: $name,data: $data) {
               id,name,type,size,publicKey,data,user{id}
            }
        }`

        const updateFileResponse = await server.mutate(
            {
                mutation: updateFileMutation,
                variables: {
                    id: createModel1Response.data.createFile.id,
                    name: 'File/name/rtytc56',
                    data: 'File/data/oplmk34',
                },
            },
            token,
        )
        expect(updateFileResponse).not.toHaveProperty('errors')
        expect(updateFileResponse).toHaveProperty('data.updateFile.name', 'File/name/rtytc56')
        expect(updateFileResponse).toHaveProperty('data.updateFile.data', 'File/data/oplmk34')

        // the file location is not changet after update name
        const updateFileRaw = await modelFile.findById(createModel1Response.data.createFile.id)
        const stat2 = fs.statSync(createFileRaw.__path)
        expect(stat2).toBeDefined()
        expect(stat2.size).toEqual(createFileRaw.size)
        expect(updateFileRaw.__path).toEqual(createFileRaw.__path)

        // the file content changed after changed data
        const dataInFile = fs.readFileSync(updateFileRaw.__path).toString()
        expect(dataInFile).toEqual('File/data/oplmk34')
    })

    it('removeFile', async () => {
        const token = res.data.login_v1.token
        const modelFile = server.entry.models['file']

        const createModel1Mutation = `mutation File($name: String!,$data: String!, $userId:ID){
            createFile(name: $name,data: $data, userId:$userId) {
               id,name,type,size,publicKey,user{id}
            }
        }`

        const createModel1Response = await server.mutate(
            {
                mutation: createModel1Mutation,
                variables: {
                    name: 'File/name/zxr09tc',
                    data: 'File/data/cv89lmk',
                    userId: res.data.login_v1.user.id,
                },
            },
            token,
        )

        const createFileRaw = await modelFile.findById(createModel1Response.data.createFile.id)
        const stat1 = fs.statSync(createFileRaw.__path)
        expect(stat1).toBeDefined()
        expect(stat1.size).toEqual(createFileRaw.size)

        const updateFileMutation = `mutation removeFile($id:ID!){
            removeFile(id:$id) {
               id
            }
        }`

        const removeFileResponse = await server.mutate(
            {
                mutation: updateFileMutation,
                variables: {
                    id: createModel1Response.data.createFile.id,
                    name: 'File/name/rtytc56',
                    data: 'File/data/oplmk34',
                },
            },
            token,
        )
        expect(removeFileResponse).not.toHaveProperty('errors')
        expect(removeFileResponse).toHaveProperty('data.removeFile.id', createModel1Response.data.createFile.id)

        expect(() => fs.statSync(createFileRaw.__path)).toThrowError(/ENOENT: no such file/)
    })

    it('upload file', async () => {
        const token = res.data.login_v1.token
        const uploadRequest = await request(server.koa)
            .post('/upload')
            .set('Authorization', 'Bearer ' + token)
            .attach('name', './package.json')

        expect(uploadRequest.text).toBeDefined()
        const uploadJSON = JSON.parse(uploadRequest.text)
        expect(uploadJSON).toHaveProperty('id')
        expect(uploadJSON).toHaveProperty('publicKey')
        expect(uploadJSON).toHaveProperty('size')
        expect(uploadJSON).toHaveProperty('name', 'package.json')
        expect(uploadJSON).toHaveProperty('type', 'application/json')

        const oneFileQuery = `query File($id: ID!){
            File(id: $id) {
                data,name,type,size,publicKey,id
            }
        }`

        const oneFileResponse = await server.query(
            {
                query: oneFileQuery,
                variables: { id: uploadJSON.id },
            },
            token,
        )

        expect(oneFileResponse).not.toHaveProperty('errors')
        expect(oneFileResponse).toHaveProperty('data.File.name', 'package.json')
        expect(oneFileResponse).toHaveProperty('data.File.size', uploadJSON.size)
        expect(oneFileResponse).toHaveProperty('data.File.type', uploadJSON.type)
        expect(oneFileResponse).toHaveProperty('data.File.publicKey', uploadJSON.publicKey)

        const packageJson = fs.readFileSync('./package.json').toString()
        expect(oneFileResponse).toHaveProperty('data.File.data', packageJson)

        // download with public key
        const downloadRequestPublicKey = await request(server.koa).get('/download/' + uploadJSON.publicKey)
        expect(downloadRequestPublicKey).toHaveProperty('ok', true)
        expect(downloadRequestPublicKey).toHaveProperty('text', packageJson)
        expect(downloadRequestPublicKey).toHaveProperty('headers.content-disposition', 'attachment; filename=package.json')
        expect(downloadRequestPublicKey).toHaveProperty('headers.content-type', 'application/json')
        expect(downloadRequestPublicKey).toHaveProperty('headers.content-length', `${uploadJSON.size}`)

        // download with id WITH token
        const downloadRequestIdToken = await request(server.koa)
            .get('/download/' + uploadJSON.id)
            .set('Authorization', 'Bearer ' + token)
        expect(downloadRequestIdToken).toHaveProperty('ok', true)
        expect(downloadRequestIdToken).toHaveProperty('text', packageJson)
        expect(downloadRequestIdToken).toHaveProperty('headers.content-disposition', 'attachment; filename=package.json')
        expect(downloadRequestIdToken).toHaveProperty('headers.content-type', 'application/json')
        expect(downloadRequestIdToken).toHaveProperty('headers.content-length', `${uploadJSON.size}`)

        // download with id without token
        const downloadRequestId = await request(server.koa).get('/download/' + uploadJSON.id)
        expect(downloadRequestId).toHaveProperty('ok', false)
        expect(downloadRequestId.body).toEqual(expect.objectContaining({ error: { message: 'Unauthorized' } }))
    })
})
