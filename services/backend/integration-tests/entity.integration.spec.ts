import * as request from 'supertest'
import { disconnectFromServer, generateAndRunServerFromSchema, loadGraphQL } from './utils'

export async function createModel1(server, token, data, relations = {}) {
    if (relations['model2'] && Array.isArray(relations['model2'])) {
        const modelmodel2 = server.entry.models['model2']
        const modelmodel2Data = await Promise.all(relations['model2'].map((m) => modelmodel2.create(m)))
        data.model2Ids = modelmodel2Data.map((d) => d.id)
    }

    const createModel1Mutation = `mutation CreateModel1($name: String!,$opt: String,$optInt: Int,$optFloat: Float,$arrName: [String],$arrInt: [Int],$arrFloat: [Float],$optDateTime: DateTime,$entity: [InEntity1MemberEntityAsEntity1!]){
        createModel1(name: $name,opt: $opt,optInt: $optInt,optFloat: $optFloat,arrName: $arrName,arrInt: $arrInt,arrFloat: $arrFloat,optDateTime: $optDateTime,entity: $entity) {
        name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,entity{name,opt,optFloat},id
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

    const createModel2Mutation = `mutation CreateModel2($name: String!,$opt: String,$optFloat: Float,$model1: InModel2MemberModel1AsModel1,$model1Id: ID){
        createModel2(name: $name,opt: $opt,optFloat: $optFloat,model1: $model1, model1Id: $model1Id) {
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

describe('entity integration', () => {
    let server
    let res

    beforeAll(async () => {
        server = await generateAndRunServerFromSchema(
            'entity',
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
                    entity: Entity1[]
                }

                type Entity1 @entity {
                    name: String!
                    opt: String
                    optFloat: Float
                }
            `,
            3003,
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

    it('create Model1', async () => {
        const token = res.data.login_v1.token

        // const modelModel2 = server.entry.models['model2']

        // const modelModel2Data = await Promise.all([
        //     modelModel2.create({
        //         name: 'Model2/name/ro62fot',
        //         opt: 'Model2/opt/iox3uq54',
        //         optFloat: 301064.4681170487,
        //         model1: '607bc7944481571f509470a2',
        //         id: 'Model2/id/adlws4v3',
        //     }),
        //     modelModel2.create({
        //         name: 'Model2/name/0tmtk7o8',
        //         opt: 'Model2/opt/wbap1d0a',
        //         optFloat: 984941.7719318485,
        //         model1: '607bc7944481571f509470a2',
        //         id: 'Model2/id/x02w41wn',
        //     }),
        //     modelModel2.create({
        //         name: 'Model2/name/2pyhphab',
        //         opt: 'Model2/opt/zezduro',
        //         optFloat: 845804.2934027282,
        //         model1: '607bc7944481571f509470a2',
        //         id: 'Model2/id/ukzswjl9',
        //     }),
        // ])

        const createModel1Mutation = `mutation CreateModel1($name: String!,$opt: String,$optInt: Int,$optFloat: Float,$arrName: [String],$arrInt: [Int],$arrFloat: [Float],$optDateTime: DateTime,$entity: [InEntity1MemberEntityAsEntity1!]){
        createModel1(name: $name,opt: $opt,optInt: $optInt,optFloat: $optFloat,arrName: $arrName,arrInt: $arrInt,arrFloat: $arrFloat,optDateTime: $optDateTime,entity: $entity) {
           name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,entity{name, opt, optFloat},id
        }
    }`

        const createModel1Response = await server.mutate(
            {
                mutation: createModel1Mutation,
                variables: {
                    name: 'Model1/name/xie76tc',
                    opt: 'Model1/opt/allzauub',
                    optInt: 521167,
                    optFloat: 617953.2791989135,
                    arrName: ['Model1/arrName/e9a6l28', 'Model1/arrName/3ux94bkk', 'Model1/arrName/p3po6mke'],
                    arrInt: [950283, 522416, 826893],
                    arrFloat: [570636.4829223385, 507513.37424710894, 37220.60960374929],
                    optDateTime: '2021-01-03T23:46:55.883Z',
                    entity: [
                        {
                            name: 'Model2/name/3skrz0d6',
                            opt: 'Model2/opt/nhh0um6f',
                            optFloat: 92481.98354074644,
                        },
                        {
                            name: 'Model2/name/bltylm9p',
                            opt: 'Model2/opt/wf32gwp',
                            optFloat: 794966.9055869699,
                        },
                        {
                            name: 'Model2/name/li830nr',
                            opt: 'Model2/opt/5prbdike',
                            optFloat: 192082.14624164376,
                        },
                    ],
                    // model2Ids: [modelModel2Data[0].id, modelModel2Data[1].id, modelModel2Data[2].id],
                },
            },
            token,
        )
        expect(createModel1Response).not.toHaveProperty('errors')
        expect(createModel1Response).toHaveProperty('data.createModel1.name', 'Model1/name/xie76tc')
        expect(createModel1Response).toHaveProperty('data.createModel1.opt', 'Model1/opt/allzauub')
        expect(createModel1Response).toHaveProperty('data.createModel1.optInt', 521167)
        expect(createModel1Response).toHaveProperty('data.createModel1.optFloat', 617953.2791989135)
        expect(createModel1Response).toHaveProperty('data.createModel1.arrName', [
            'Model1/arrName/e9a6l28',
            'Model1/arrName/3ux94bkk',
            'Model1/arrName/p3po6mke',
        ])
        expect(createModel1Response).toHaveProperty('data.createModel1.arrInt', [950283, 522416, 826893])
        expect(createModel1Response).toHaveProperty(
            'data.createModel1.arrFloat',
            [570636.4829223385, 507513.37424710894, 37220.60960374929],
        )
        expect(createModel1Response).toHaveProperty('data.createModel1.optDateTime', '2021-01-03T23:46:55.883Z')
        expect(createModel1Response.data.createModel1.entity).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'Model2/name/3skrz0d6',
                    opt: 'Model2/opt/nhh0um6f',
                    optFloat: 92481.98354074644,
                }),
                expect.objectContaining({
                    name: 'Model2/name/bltylm9p',
                    opt: 'Model2/opt/wf32gwp',
                    optFloat: 794966.9055869699,
                }),
                expect.objectContaining({
                    name: 'Model2/name/li830nr',
                    opt: 'Model2/opt/5prbdike',
                    optFloat: 192082.14624164376,
                }),
            ]),
        )

        expect(createModel1Response).toHaveProperty('data.createModel1.id')
    })

    it('one Model1', async () => {
        const token = res.data.login_v1.token

        const createModel1Data = {
            name: 'Model1/name/m31sjoz',
            opt: 'Model1/opt/xgmf7hlc',
            optInt: 56914,
            optFloat: 100650.19300819644,
            arrName: ['Model1/arrName/021wt7oe', 'Model1/arrName/14pe8714', 'Model1/arrName/xqw45vei'],
            arrInt: [653347, 490170, 765198],
            arrFloat: [608342.7840562845, 686516.0427550563, 396105.32736136264],
            optDateTime: '2020-01-06T23:36:19.348Z',
            entity: [{ name: 'Model2/name/k1hs5xxp', opt: 'Model2/opt/ksmynr3g', optFloat: 869978.7950384823 }],
        }

        const createModel1Response = await createModel1(server, token, createModel1Data)

        const oneModel1Query = `query Model1($id: ID!){
    Model1(id: $id) {
        name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,entity{name,opt,optFloat},id
    }
}`

        const oneModel1Response = await server.query(
            {
                query: oneModel1Query,
                variables: { id: createModel1Response.data.createModel1.id },
            },
            token,
        )

        expect(oneModel1Response).not.toHaveProperty('errors')
        expect(oneModel1Response).toHaveProperty('data.Model1.name', createModel1Response.data.createModel1.name)
        expect(oneModel1Response).toHaveProperty('data.Model1.opt', createModel1Response.data.createModel1.opt)
        expect(oneModel1Response).toHaveProperty('data.Model1.optInt', createModel1Response.data.createModel1.optInt)
        expect(oneModel1Response).toHaveProperty(
            'data.Model1.optFloat',
            createModel1Response.data.createModel1.optFloat,
        )
        expect(oneModel1Response).toHaveProperty('data.Model1.arrName', createModel1Response.data.createModel1.arrName)
        expect(oneModel1Response).toHaveProperty('data.Model1.arrInt', createModel1Response.data.createModel1.arrInt)
        expect(oneModel1Response).toHaveProperty(
            'data.Model1.arrFloat',
            createModel1Response.data.createModel1.arrFloat,
        )
        expect(oneModel1Response).toHaveProperty(
            'data.Model1.optDateTime',
            createModel1Response.data.createModel1.optDateTime,
        )
        expect(oneModel1Response.data.Model1.entity).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'Model2/name/k1hs5xxp',
                    opt: 'Model2/opt/ksmynr3g',
                    optFloat: 869978.7950384823,
                }),
            ]),
        )

        expect(oneModel1Response).toHaveProperty('data.Model1.id', createModel1Response.data.createModel1.id)
    })

    it('update Model1', async () => {
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
            entity: [{ name: 'Model2/name/99wyxtpb', opt: 'Model2/opt/gc9v3645', optFloat: 128002.71510919803 }],
        }

        const createModel1Response = await createModel1(server, token, createModel1Data)

        const updateModel1Mutation = `mutation UpdateModel1($name: String!,$opt: String,$optInt: Int,$optFloat: Float,$arrName: [String],$arrInt: [Int],$arrFloat: [Float],$optDateTime: DateTime,$entity: [InEntity1MemberEntityAsEntity1!],$id: ID!){
    updateModel1(name: $name,opt: $opt,optInt: $optInt,optFloat: $optFloat,arrName: $arrName,arrInt: $arrInt,arrFloat: $arrFloat,optDateTime: $optDateTime,entity: $entity, id: $id) {
       name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,entity{name,opt,optFloat},id
    }
}`

        const updateModel1Response = await server.mutate(
            {
                mutation: updateModel1Mutation,
                variables: {
                    name: 'Model1/name/rabm0ueo',
                    opt: 'Model1/opt/iyy46ulc',
                    optInt: 564003,
                    optFloat: 710838.0456158707,
                    arrName: ['Model1/arrName/18cic326', 'Model1/arrName/uoib8f8k', 'Model1/arrName/4vsdxon'],
                    arrInt: [969299, 459931, 920080],
                    arrFloat: [919167.4541117561, 816683.5093124962, 811748.9766200358],
                    optDateTime: '2020-08-31T22:21:58.155Z',
                    entity: [
                        {
                            name: 'Model2/name/9ulw9lt',
                            opt: 'Model2/opt/jadugtzg',
                            optFloat: 734552.4338407698,
                        },
                    ],
                    id: createModel1Response.data.createModel1.id,
                },
            },
            token,
        )

        expect(updateModel1Response).not.toHaveProperty('errors')
        expect(updateModel1Response).toHaveProperty('data.updateModel1.name', 'Model1/name/rabm0ueo')
        expect(updateModel1Response).toHaveProperty('data.updateModel1.opt', 'Model1/opt/iyy46ulc')
        expect(updateModel1Response).toHaveProperty('data.updateModel1.optInt', 564003)
        expect(updateModel1Response).toHaveProperty('data.updateModel1.optFloat', 710838.0456158707)
        expect(updateModel1Response).toHaveProperty('data.updateModel1.arrName', [
            'Model1/arrName/18cic326',
            'Model1/arrName/uoib8f8k',
            'Model1/arrName/4vsdxon',
        ])
        expect(updateModel1Response).toHaveProperty('data.updateModel1.arrInt', [969299, 459931, 920080])
        expect(updateModel1Response).toHaveProperty(
            'data.updateModel1.arrFloat',
            [919167.4541117561, 816683.5093124962, 811748.9766200358],
        )
        expect(updateModel1Response).toHaveProperty('data.updateModel1.optDateTime', '2020-08-31T22:21:58.155Z')
        expect(updateModel1Response.data.updateModel1.entity).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'Model2/name/9ulw9lt',
                    opt: 'Model2/opt/jadugtzg',
                    optFloat: 734552.4338407698,
                }),
            ]),
        )

        expect(updateModel1Response).toHaveProperty('data.updateModel1.id', createModel1Response.data.createModel1.id)
    })

    it('all Model1', async () => {
        const token = res.data.login_v1.token

        const createModel1Data = {
            name: 'Model1/name/t41te99',
            opt: 'Model1/opt/fm1bxamv',
            optInt: 624050,
            optFloat: 15707.226870998791,
            arrName: ['Model1/arrName/po2y9x7s', 'Model1/arrName/fumo2e1', 'Model1/arrName/jw4xhp3p'],
            arrInt: [74695, 979639, 194851],
            arrFloat: [16373.13472973645, 173834.21646217513, 426517.8765657782],
            optDateTime: '2020-10-02T22:49:58.883Z',
            entity: [{ name: 'Model2/name/4lx0o86', opt: 'Model2/opt/nx9e9uuv', optFloat: 642556.2737034869 }],
        }

        const createModel1Response = await createModel1(server, token, createModel1Data)

        const createModel1Data2 = {
            name: 'Model1/name/h8i146ut',
            opt: 'Model1/opt/c830pb6g',
            optInt: 285531,
            optFloat: 441859.478726337,
            arrName: ['Model1/arrName/697rqk6r', 'Model1/arrName/zsi8o0yl', 'Model1/arrName/uz5m9d6c'],
            arrInt: [65169, 597749, 437459],
            arrFloat: [588043.3770093702, 284717.7617158319, 494524.91148259805],
            optDateTime: '2021-02-25T23:04:01.102Z',
            entity: [{ name: 'Model2/name/2ql174fa', opt: 'Model2/opt/m46f1fcc', optFloat: 215141.87919157668 }],
        }
        const createModel1Response2 = await createModel1(server, token, createModel1Data2)

        const allModel1Query = `query allModel1 {
    allModel1 {
        name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,entity{name,opt,optFloat},id
    }
}`

        const allModel1Response = await server.query(
            {
                query: allModel1Query,
                variables: { id: createModel1Response.data.createModel1.id },
            },
            token,
        )

        expect(allModel1Response.data.allModel1).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: createModel1Response.data.createModel1.name,
                    opt: createModel1Response.data.createModel1.opt,
                    optInt: createModel1Response.data.createModel1.optInt,
                    optFloat: createModel1Response.data.createModel1.optFloat,
                    arrName: createModel1Response.data.createModel1.arrName,
                    arrInt: createModel1Response.data.createModel1.arrInt,
                    arrFloat: createModel1Response.data.createModel1.arrFloat,
                    optDateTime: createModel1Response.data.createModel1.optDateTime,
                    entity: expect.arrayContaining([
                        expect.objectContaining({
                            name: 'Model2/name/4lx0o86',
                            opt: 'Model2/opt/nx9e9uuv',
                            optFloat: 642556.2737034869,
                        }),
                    ]),
                    id: createModel1Response.data.createModel1.id,
                }),
                expect.objectContaining({
                    name: createModel1Response2.data.createModel1.name,
                    opt: createModel1Response2.data.createModel1.opt,
                    optInt: createModel1Response2.data.createModel1.optInt,
                    optFloat: createModel1Response2.data.createModel1.optFloat,
                    arrName: createModel1Response2.data.createModel1.arrName,
                    arrInt: createModel1Response2.data.createModel1.arrInt,
                    arrFloat: createModel1Response2.data.createModel1.arrFloat,
                    optDateTime: createModel1Response2.data.createModel1.optDateTime,
                    entity: expect.arrayContaining([
                        expect.objectContaining({
                            name: 'Model2/name/2ql174fa',
                            opt: 'Model2/opt/m46f1fcc',
                            optFloat: 215141.87919157668,
                        }),
                    ]),
                    id: createModel1Response2.data.createModel1.id,
                }),
            ]),
        )
    })

    it('remove Model1', async () => {
        const token = res.data.login_v1.token

        const createModel1Data = {
            name: 'Model1/name/frwqgrl3',
            opt: 'Model1/opt/wtwznya5',
            optInt: 769003,
            optFloat: 5449.282262900201,
            arrName: ['Model1/arrName/1tsrvto9', 'Model1/arrName/wht5hoxd', 'Model1/arrName/9kg16fqc'],
            arrInt: [563899, 900260, 637807],
            arrFloat: [659700.5044207514, 151109.23957118284, 640352.3896067109],
            optDateTime: '2020-06-21T22:51:04.220Z',
            entity: [{ name: 'Model2/name/2iafhse', opt: 'Model2/opt/eaushr7d', optFloat: 265279.86436118267 }],
        }

        const createModel1Response = await createModel1(server, token, createModel1Data)

        const removeModel1Mutation = `mutation RemoveModel1($id: ID!){
                removeModel1(id: $id) {
                id
                }
            }`

        const removeModel1Response = await server.mutate(
            {
                mutation: removeModel1Mutation,
                variables: { id: createModel1Response.data.createModel1.id },
            },
            token,
        )

        expect(removeModel1Response).not.toHaveProperty('errors')
        expect(removeModel1Response).toHaveProperty('data.removeModel1.id', createModel1Response.data.createModel1.id)

        const model1Check = await server.entry.models['model1'].findById(createModel1Response.data.createModel1.id)
        expect(model1Check).toBeNull()
    })
})
