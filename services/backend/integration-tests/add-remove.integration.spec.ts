import * as request from 'supertest'
import { disconnectFromServer, generateAndRunServerFromSchema, loadGraphQL } from './utils'

describe('add-remove integration', () => {
    let server
    let res

    beforeAll(async () => {
        server = await generateAndRunServerFromSchema(
            'add-remove',
            `
                @all(filter:"user_every.id={{userId}}")
                type Model1 @model {
                    name: String!
                    opt: String
                    optInt: Int
                    optFloat: Float
                    arrName: String[]
                    arrInt: Int[]
                    arrFloat: Float[]
                    optDateTime: DateTime
                    model2: @relation(name: "Model1ToModel2")[]
                }

                type Model2 @model {
                    name: String!
                    opt: String
                    optFloat: Float
                    model1: @relation(name: "Model1ToModel2")[]
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

    it('add', async () => {
        const token = res.data.login_v1.token

        const createModel1Data = {
            name: 'Model1/name/9xdozt5',
            opt: 'Model1/opt/veuzo6fw',
            optInt: 178908,
            optFloat: 270263.47104221646,
            arrName: ['Model1/arrName/z16efwi', 'Model1/arrName/itt8ze0a', 'Model1/arrName/1hgi59zd'],
            arrInt: [841914, 706908, 381989],
            arrFloat: [981172.4638921468, 595172.7641393992, 950648.2557312585],
            optDateTime: '2020-02-24T23:09:16.338Z',
        }

        const createModel2Data = {
            name: 'Model2/name/x38jdqjk',
            opt: 'Model2/opt/6s47179m',
            optFloat: 218101.0611238121,
        }

        const [createModel1Response, createModel2Response] = await Promise.all([createModel1(server, token, createModel1Data), createModel2(server, token, createModel2Data)])

        const updateModel1Mutation = `mutation LinkModel1ToModel2($model1Id: ID!, $model2Id: ID!) {
            linkModel1ToModel2(model1Id: $model1Id, model2Id: $model2Id){
                model1Id
                model2Id
            }
        }`

        const updateModel1Response = await server.mutate(
            {
                mutation: updateModel1Mutation,
                variables: {
                    model1Id: createModel1Response.data.createModel1.id,
                    model2Id: createModel2Response.data.createModel2.id,
                },
            },
            token,
        )

        expect(updateModel1Response).not.toHaveProperty('errors')
        expect(updateModel1Response).toHaveProperty('data.updateModel1.name', 'Model1/name/9xdozt5')
        expect(updateModel1Response).toHaveProperty('data.updateModel1.opt', 'Model1/opt/iyy46ulc')
    })
})

export async function createModel1(server, token, data, relations = {}) {
    if (relations['model2'] && Array.isArray(relations['model2'])) {
        const modelmodel2 = server.entry.models['model2']
        const modelmodel2Data = await Promise.all(relations['model2'].map((m) => modelmodel2.create(m)))
        data.model2Ids = modelmodel2Data.map((d) => d.id)
    }

    const createModel1Mutation = `mutation CreateModel1($name: String!,$opt: String,$optInt: Int,$optFloat: Float,$arrName: [String],$arrInt: [Int],$arrFloat: [Float],$optDateTime: DateTime,$model2: [InModel1MemberModel2AsModel2!],$model2Ids: [ID!]){
        createModel1(name: $name,opt: $opt,optInt: $optInt,optFloat: $optFloat,arrName: $arrName,arrInt: $arrInt,arrFloat: $arrFloat,optDateTime: $optDateTime,model2: $model2, model2Ids: $model2Ids) {
        name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,model2{name,opt,optFloat,model1{id},id},id
        }
    }`

    const createModel1Response = await server.mutate(
        {
            mutation: createModel1Mutation,
            variables: data,
        },
        token,
    )

    return createModel1Response
}

export async function createModel2(server, token, data, relations = {}) {
    if (relations['model1']) {
        const modelmodel1 = server.entry.models['model1']
        const modelmodel1Data = await modelmodel1.create(relations['model1'])
        data.model1Id = modelmodel1Data.id
    }

    const createModel2Mutation = `mutation CreateModel2($name: String!,$opt: String,$optFloat: Float,$model1: [InModel2MemberModel1AsModel1],$model1Ids: [ID]){
        createModel2(name: $name,opt: $opt,optFloat: $optFloat,model1: $model1, model1Ids: $model1Ids) {
        name,opt,optFloat,model1{name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,model2{id},id},id
        }
    }`

    const createModel2Response = await server.mutate(
        {
            mutation: createModel2Mutation,
            variables: data,
        },
        token,
    )

    return createModel2Response
}
