import * as request from 'supertest'
import { serialize } from 'v8'
import { disconnectFromServer, generateAndRunServerFromSchema, loadGraphQL } from './utils'


describe('couad integration', () => {
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
    })



    it('one Model1', async () => {
        const token = res.data.login_v1.token
        const modelFile = server.entry.models['file']
        
        const createModel1Mutation = `mutation Filr($name: String!,$data: String!, $userId:ID){
            createFile(name: $name,data: $data, userId:$userId) {
               id,name,type,size,publicKey,user{id}
            }
        }`
    
        const createModel1Response = await server.mutate({
            mutation: createModel1Mutation,
            variables: {
                name: 'File/name/xid52tc',
                data: 'File/data/fgh47mk',
                userId: res.data.login_v1.user.id,
            },
        }, token)

        
        const oneFileQuery = `query File($id: ID!){
    File(id: $id) {
        data,name,type,size,publicKey,id
    }
}`

        const oneModel1Response = await server.query(
            {
                query: oneFileQuery,
                variables: { id: createModel1Response.data.createFile.id },
            },
            token,
        )

        expect(oneModel1Response).not.toHaveProperty('errors')
        expect(oneModel1Response).toHaveProperty('data.File.name', 'File/name/xid52tc')
        expect(oneModel1Response).toHaveProperty('data.File.data', 'File/data/fgh47mk')
        
    })

    
})
