import * as request from 'supertest'
import { disconnectFromServer, generateAndRunServerFromSchema, loadGraphQL } from './utils'

describe('add-remove integration', () => {
    let server
    let loginRes
    let registerRes

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
                    arrName: [String]
                    arrInt: [Int]
                    arrFloat: [Float]
                    optDateTime: DateTime
                    model2: [@relation(name: "Model1ToModel2")]
                }

                type Model2 @model {
                    name: String!
                    opt: String
                    optFloat: Float
                    model1: [@relation(name: "Model1ToModel2")]
                }
            `,
            3004,
        )

        const loginQL = loadGraphQL('./services/backend/integration-tests/graphql/login/login.gql')

        loginRes = await server.mutate({
            mutation: loginQL,
            variables: {
                email: 'admin@admin.test',
                pass: 'admin@admin.test',
            },
        })

        expect(loginRes).not.toHaveProperty('errors')
        expect(loginRes).toHaveProperty('data.login_v1.token')
        expect(loginRes).toHaveProperty('data.login_v1.refreshToken')
        expect(loginRes).toHaveProperty('data.login_v1.user.id')
        expect(loginRes).toHaveProperty('data.login_v1.user.email', 'admin@admin.test')
        expect(loginRes).toHaveProperty('data.login_v1.user.roles', [{ name: 'admin' }])

        const registerMutation = loadGraphQL('./services/backend/integration-tests/graphql/login/register.gql')
        registerRes = await server.mutate({
            mutation: registerMutation,
            variables: {
                email: 'user1@user1.com',
                pass: 'user1@user1.com',
            },
        })

        expect(registerRes).not.toHaveProperty('errors')
        expect(registerRes).toHaveProperty('data.register_v1.token')
        expect(registerRes).toHaveProperty('data.register_v1.refreshToken')
        expect(registerRes).toHaveProperty('data.register_v1.user.id')
        expect(registerRes).toHaveProperty('data.register_v1.user.email', 'user1@user1.com')
        expect(registerRes).toHaveProperty('data.register_v1.user.roles', [])
    })

    afterAll(async () => {
        await disconnectFromServer(server)
    })

    it('link model1 and model2', async () => {
        const token = loginRes.data.login_v1.token

        const [[createModel1Response, createModel1Data], [createModel2Response, createModel2Data]] = await Promise.all([
            createModel1(server, token, { name: 'Model1/name/coz34ozt5' }),
            createModel2(server, token, { name: 'Model2/name/xdr11qjk' }),
        ])

        const oneModel1BeforeResponse = await oneModel1Query(server, createModel1Response.data.createModel1.id, token)
        expect(oneModel1BeforeResponse).not.toHaveProperty('errors')
        expect(oneModel1BeforeResponse.data.Model1).toHaveProperty('model2')
        expect(oneModel1BeforeResponse.data.Model1.model2).toEqual(
            expect.not.arrayContaining([
                expect.objectContaining({
                    id: createModel2Response.data.createModel2.id,
                }),
            ]),
        )
        const oneModel2BeforeResponse = await oneModel2Query(server, createModel2Response.data.createModel2.id, token)
        expect(oneModel2BeforeResponse).not.toHaveProperty('errors')
        expect(oneModel2BeforeResponse.data.Model2).toHaveProperty('model1')
        expect(oneModel2BeforeResponse.data.Model2.model1).toEqual(
            expect.not.arrayContaining([
                expect.objectContaining({
                    id: createModel1Response.data.createModel1.id,
                }),
            ]),
        )

        // ///////////////////////////////////////////////////////////////////////////////////////////////////
        //                          LINK
        const linkModel1ToModel2Mutation = `mutation LinkModel1ToModel2($model1Id: ID!, $model2Id: ID!) {
            linkModel1ToModel2(model1Id: $model1Id, model2Id: $model2Id){
                model1Id
                model2Id
                model1ModifiedCount
                model2ModifiedCount
            }
        }`

        const linkModel1ToModel2Response = await server.mutate(
            {
                mutation: linkModel1ToModel2Mutation,
                variables: {
                    model1Id: createModel1Response.data.createModel1.id,
                    model2Id: createModel2Response.data.createModel2.id,
                },
            },
            token,
        )

        expect(linkModel1ToModel2Response).not.toHaveProperty('errors')
        expect(linkModel1ToModel2Response).toHaveProperty('data.linkModel1ToModel2.model1Id', createModel1Response.data.createModel1.id)
        expect(linkModel1ToModel2Response).toHaveProperty('data.linkModel1ToModel2.model2Id', createModel2Response.data.createModel2.id)
        expect(linkModel1ToModel2Response).toHaveProperty('data.linkModel1ToModel2.model1ModifiedCount', 1)
        expect(linkModel1ToModel2Response).toHaveProperty('data.linkModel1ToModel2.model2ModifiedCount', 1)

        const oneModel1Response = await oneModel1Query(server, createModel1Response.data.createModel1.id, token)
        expect(oneModel1Response).not.toHaveProperty('errors')
        expect(oneModel1Response.data.Model1).toHaveProperty('model2')
        expect(oneModel1Response.data.Model1.model2).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: createModel2Data.name,
                    id: createModel2Response.data.createModel2.id,
                    model1: expect.arrayContaining([expect.objectContaining({ id: createModel1Response.data.createModel1.id })]),
                }),
            ]),
        )

        const oneModel2Response = await oneModel2Query(server, createModel2Response.data.createModel2.id, token)
        expect(oneModel2Response).not.toHaveProperty('errors')
        expect(oneModel2Response.data.Model2).toHaveProperty('model1')
        expect(oneModel2Response.data.Model2.model1).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: createModel1Data.name,
                    id: createModel1Response.data.createModel1.id,
                    model2: expect.arrayContaining([expect.objectContaining({ id: createModel2Response.data.createModel2.id })]),
                }),
            ]),
        )

        // ///////////////////////////////////////////////////////////////////////////////////////////////////
        //                          LINK SECOND
        const linkModel1ToModel2SecondResponse = await server.mutate(
            {
                mutation: linkModel1ToModel2Mutation,
                variables: {
                    model1Id: createModel1Response.data.createModel1.id,
                    model2Id: createModel2Response.data.createModel2.id,
                },
            },
            token,
        )

        expect(linkModel1ToModel2SecondResponse).not.toHaveProperty('errors')
        expect(linkModel1ToModel2SecondResponse).toHaveProperty('data.linkModel1ToModel2.model1Id', createModel1Response.data.createModel1.id)
        expect(linkModel1ToModel2SecondResponse).toHaveProperty('data.linkModel1ToModel2.model2Id', createModel2Response.data.createModel2.id)
        expect(linkModel1ToModel2SecondResponse).toHaveProperty('data.linkModel1ToModel2.model1ModifiedCount', 0)
        expect(linkModel1ToModel2SecondResponse).toHaveProperty('data.linkModel1ToModel2.model2ModifiedCount', 0)
    })

    it('unlink model1 and model2', async () => {
        const token = loginRes.data.login_v1.token

        const [[createModel1Response], [createModel2Response]] = await Promise.all([createModel1(server, token), createModel2(server, token)])
        const updateModel1Response = await server.mutate(
            {
                mutation: `mutation LinkModel1ToModel2($model1Id: ID!, $model2Id: ID!) {
                    linkModel1ToModel2(model1Id: $model1Id, model2Id: $model2Id){
                        model1Id
                        model2Id
                    }
                }`,
                variables: {
                    model1Id: createModel1Response.data.createModel1.id,
                    model2Id: createModel2Response.data.createModel2.id,
                },
            },
            token,
        )

        expect(updateModel1Response).not.toHaveProperty('errors')

        const oneModel1BeforeResponse = await oneModel1Query(server, createModel1Response.data.createModel1.id, token)
        expect(oneModel1BeforeResponse).not.toHaveProperty('errors')
        expect(oneModel1BeforeResponse.data.Model1).toHaveProperty('model2')
        expect(oneModel1BeforeResponse.data.Model1.model2).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: createModel2Response.data.createModel2.id,
                }),
            ]),
        )
        const oneModel2BeforeResponse = await oneModel2Query(server, createModel2Response.data.createModel2.id, token)
        expect(oneModel2BeforeResponse).not.toHaveProperty('errors')
        expect(oneModel2BeforeResponse.data.Model2).toHaveProperty('model1')
        expect(oneModel2BeforeResponse.data.Model2.model1).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: createModel1Response.data.createModel1.id,
                }),
            ]),
        )

        // ///////////////////////////////////////////////////////////////////////////////////////////////////
        //                                  UNLINK
        const unlinkModel1FromModel2Mutation = `mutation UnlinkModel1FromModel2($model1Id: ID!, $model2Id: ID!) {
            unlinkModel1FromModel2(model1Id: $model1Id, model2Id: $model2Id){
                model1Id
                model2Id
                model1ModifiedCount
                model2ModifiedCount
            }
        }`
        const unlinkModel1FromModel2Response = await server.mutate(
            {
                mutation: unlinkModel1FromModel2Mutation,
                variables: {
                    model1Id: createModel1Response.data.createModel1.id,
                    model2Id: createModel2Response.data.createModel2.id,
                },
            },
            token,
        )

        expect(unlinkModel1FromModel2Response).not.toHaveProperty('errors')
        expect(unlinkModel1FromModel2Response).toHaveProperty('data.unlinkModel1FromModel2.model1Id', createModel1Response.data.createModel1.id)
        expect(unlinkModel1FromModel2Response).toHaveProperty('data.unlinkModel1FromModel2.model2Id', createModel2Response.data.createModel2.id)
        expect(unlinkModel1FromModel2Response).toHaveProperty('data.unlinkModel1FromModel2.model1ModifiedCount', 1)
        expect(unlinkModel1FromModel2Response).toHaveProperty('data.unlinkModel1FromModel2.model2ModifiedCount', 1)

        const oneModel1AfterResponse = await oneModel1Query(server, createModel1Response.data.createModel1.id, token)
        expect(oneModel1AfterResponse).not.toHaveProperty('errors')
        expect(oneModel1AfterResponse.data.Model1).toHaveProperty('model2')
        expect(oneModel1AfterResponse.data.Model1.model2).toEqual(
            expect.not.arrayContaining([
                expect.objectContaining({
                    id: createModel2Response.data.createModel2.id,
                }),
            ]),
        )
        const oneModel2AfterResponse = await oneModel2Query(server, createModel2Response.data.createModel2.id, token)
        expect(oneModel2AfterResponse).not.toHaveProperty('errors')
        expect(oneModel2AfterResponse.data.Model2).toHaveProperty('model1')
        expect(oneModel2AfterResponse.data.Model2.model1).toEqual(
            expect.not.arrayContaining([
                expect.objectContaining({
                    id: createModel1Response.data.createModel1.id,
                }),
            ]),
        )

        // ///////////////////////////////////////////////////////////////////////////////////////////////////
        //                                 UNLINK second time
        const unlinkModel1FromModel2SecondResponse = await server.mutate(
            {
                mutation: unlinkModel1FromModel2Mutation,
                variables: {
                    model1Id: createModel1Response.data.createModel1.id,
                    model2Id: createModel2Response.data.createModel2.id,
                },
            },
            token,
        )

        expect(unlinkModel1FromModel2SecondResponse).not.toHaveProperty('errors')
        expect(unlinkModel1FromModel2SecondResponse).toHaveProperty('data.unlinkModel1FromModel2.model1Id', createModel1Response.data.createModel1.id)
        expect(unlinkModel1FromModel2SecondResponse).toHaveProperty('data.unlinkModel1FromModel2.model2Id', createModel2Response.data.createModel2.id)
        expect(unlinkModel1FromModel2SecondResponse).toHaveProperty('data.unlinkModel1FromModel2.model1ModifiedCount', 0)
        expect(unlinkModel1FromModel2SecondResponse).toHaveProperty('data.unlinkModel1FromModel2.model2ModifiedCount', 0)
    })

    it('add role to user and remove role from user with admin token', async () => {
        const adminToken = loginRes.data.login_v1.token
        const userRoleModel = server.entry.models['userRole']
        const [custom1, admin] = await Promise.all([userRoleModel.create({ name: 'custom1' }), userRoleModel.findOne({ name: 'admin' }).lean()])

        const oneModel1BeforeResponse = await oneUserQuery(server, registerRes.data.register_v1.user.id, adminToken)
        //const oneModel1BeforeResponse = await oneUserQuery(server, loginRes.data.login_v1.user.id, token)
        expect(oneModel1BeforeResponse).not.toHaveProperty('errors')
        expect(oneModel1BeforeResponse.data.User).toHaveProperty('roles')
        expect(oneModel1BeforeResponse.data.User.roles).toEqual(expect.not.arrayContaining([expect.objectContaining({ name: 'admin' })]))
        expect(oneModel1BeforeResponse.data.User.roles).toEqual(expect.not.arrayContaining([expect.objectContaining({ name: 'custom1' })]))

        // ///////////////////////////////////////////////////////////////////////////////////////////////////
        //                     ADD Admin role
        const addUserRoleToUserMutation = `mutation AddRoleToUser($userId: ID!, $userRoleId: ID!) {
            addRoleToUser(userId: $userId, userRoleId: $userRoleId){
                userId
                userRoleId
                userModifiedCount
                userRoleModifiedCount
            }
        }`

        const addUserRoleToUserAdminResponse = await server.mutate(
            {
                mutation: addUserRoleToUserMutation,
                variables: {
                    userId: registerRes.data.register_v1.user.id,
                    userRoleId: admin._id.toString(),
                },
            },
            adminToken,
        )
        expect(addUserRoleToUserAdminResponse).not.toHaveProperty('errors')
        expect(addUserRoleToUserAdminResponse).toHaveProperty('data.addRoleToUser.userId', registerRes.data.register_v1.user.id)
        expect(addUserRoleToUserAdminResponse).toHaveProperty('data.addRoleToUser.userRoleId', admin._id.toString())
        expect(addUserRoleToUserAdminResponse).toHaveProperty('data.addRoleToUser.userModifiedCount', 1)
        expect(addUserRoleToUserAdminResponse).toHaveProperty('data.addRoleToUser.userModifiedCount', 1)

        const oneModel1AfterAdminResponse = await oneUserQuery(server, registerRes.data.register_v1.user.id, adminToken)
        //const oneModel1BeforeResponse = await oneUserQuery(server, loginRes.data.login_v1.user.id, token)
        expect(oneModel1AfterAdminResponse).not.toHaveProperty('errors')
        expect(oneModel1AfterAdminResponse.data.User).toHaveProperty('roles')
        expect(oneModel1AfterAdminResponse.data.User.roles).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'admin' })]))
        expect(oneModel1AfterAdminResponse.data.User.roles).toEqual(expect.not.arrayContaining([expect.objectContaining({ name: 'custom1' })]))

        // ///////////////////////////////////////////////////////////////////////////////////////////////////
        //                      Remove Admin role
        const removeUserRoleToUserMutation = `mutation RemoveRoleFromUser($userId: ID!, $userRoleId: ID!) {
            removeRoleFromUser(userId: $userId, userRoleId: $userRoleId){
                userId
                userRoleId
                userModifiedCount
                userRoleModifiedCount
            }
        }`

        const removeUserRoleToUserAdminResponse = await server.mutate(
            {
                mutation: removeUserRoleToUserMutation,
                variables: {
                    userId: registerRes.data.register_v1.user.id,
                    userRoleId: admin._id.toString(),
                },
            },
            adminToken,
        )
        expect(removeUserRoleToUserAdminResponse).not.toHaveProperty('errors')
        expect(removeUserRoleToUserAdminResponse).toHaveProperty('data.removeRoleFromUser.userId', registerRes.data.register_v1.user.id)
        expect(removeUserRoleToUserAdminResponse).toHaveProperty('data.removeRoleFromUser.userRoleId', admin._id.toString())
        expect(removeUserRoleToUserAdminResponse).toHaveProperty('data.removeRoleFromUser.userModifiedCount', 1)
        expect(removeUserRoleToUserAdminResponse).toHaveProperty('data.removeRoleFromUser.userModifiedCount', 1)

        const oneModel1AfterAdminRemoveResponse = await oneUserQuery(server, registerRes.data.register_v1.user.id, adminToken)
        //const oneModel1BeforeResponse = await oneUserQuery(server, loginRes.data.login_v1.user.id, token)
        expect(oneModel1AfterAdminRemoveResponse).not.toHaveProperty('errors')
        expect(oneModel1AfterAdminRemoveResponse.data.User).toHaveProperty('roles')
        expect(oneModel1AfterAdminRemoveResponse.data.User.roles).toEqual(expect.not.arrayContaining([expect.objectContaining({ name: 'admin' })]))
        expect(oneModel1AfterAdminRemoveResponse.data.User.roles).toEqual(expect.not.arrayContaining([expect.objectContaining({ name: 'custom1' })]))

        // ///////////////////////////////////////////////////////////////////////////////////////////////////
        //                           Try remove custom what doesn't exist in user1
        const removeUserRoleFromUserCustom1Response = await server.mutate(
            {
                mutation: removeUserRoleToUserMutation,
                variables: {
                    userId: registerRes.data.register_v1.user.id,
                    userRoleId: admin._id.toString(),
                },
            },
            adminToken,
        )
        expect(removeUserRoleFromUserCustom1Response).not.toHaveProperty('errors')
        expect(removeUserRoleFromUserCustom1Response).toHaveProperty('data.removeRoleFromUser.userId', registerRes.data.register_v1.user.id)
        expect(removeUserRoleFromUserCustom1Response).toHaveProperty('data.removeRoleFromUser.userRoleId', admin._id.toString())
        expect(removeUserRoleFromUserCustom1Response).toHaveProperty('data.removeRoleFromUser.userModifiedCount', 0)
        expect(removeUserRoleFromUserCustom1Response).toHaveProperty('data.removeRoleFromUser.userModifiedCount', 0)
    })

    it('not add role by regular user', async () => {
        const registerMutation = loadGraphQL('./services/backend/integration-tests/graphql/login/register.gql')
        const registerNewUserRes = await server.mutate({
            mutation: registerMutation,
            variables: {
                email: 'user2xt53@user2xt53.com',
                pass: 'user2xt53@user2xt53.com',
            },
        })
        const userToken = registerNewUserRes.data.register_v1.token
        const userRoleModel = server.entry.models['userRole']
        const [admin] = await Promise.all([userRoleModel.findOne({ name: 'admin' }).lean()])

        const oneUserBeforeResponse = await oneUserQuery(server, registerNewUserRes.data.register_v1.user.id, userToken)
        //const oneModel1BeforeResponse = await oneUserQuery(server, loginRes.data.login_v1.user.id, token)
        expect(oneUserBeforeResponse).not.toHaveProperty('errors')
        expect(oneUserBeforeResponse.data.User).toHaveProperty('roles')
        expect(oneUserBeforeResponse.data.User.roles).toEqual(expect.not.arrayContaining([expect.objectContaining({ name: 'admin' })]))
        expect(oneUserBeforeResponse.data.User.roles).toEqual(expect.not.arrayContaining([expect.objectContaining({ name: 'custom1' })]))

        // ///////////////////////////////////////////////////////////////////////////////////////////////////
        //                     ADD Admin role
        const addUserRoleToUserMutation = `mutation AddRoleToUser($userId: ID!, $userRoleId: ID!) {
            addRoleToUser(userId: $userId, userRoleId: $userRoleId){
                userId
                userRoleId
                userModifiedCount
                userRoleModifiedCount
            }
        }`

        const addUserRoleToUserAdminResponse = await server.mutate(
            {
                mutation: addUserRoleToUserMutation,
                variables: {
                    userId: registerRes.data.register_v1.user.id,
                    userRoleId: admin._id.toString(),
                },
            },
            userToken,
        )
        expect(addUserRoleToUserAdminResponse).toHaveProperty('errors')
        expect(addUserRoleToUserAdminResponse).not.toHaveProperty('data.addRoleToUser.userId', registerRes.data.register_v1.user.id)
        expect(addUserRoleToUserAdminResponse).not.toHaveProperty('data.addRoleToUser.userRoleId', admin._id.toString())
        expect(addUserRoleToUserAdminResponse).not.toHaveProperty('data.addRoleToUser.userModifiedCount', 1)
        expect(addUserRoleToUserAdminResponse).not.toHaveProperty('data.addRoleToUser.userModifiedCount', 1)

        const oneUserAfterResponse = await oneUserQuery(server, registerNewUserRes.data.register_v1.user.id, userToken)
        //const oneModel1BeforeResponse = await oneUserQuery(server, loginRes.data.login_v1.user.id, token)
        expect(oneUserAfterResponse).not.toHaveProperty('errors')
        expect(oneUserAfterResponse.data.User).toHaveProperty('roles')
        expect(oneUserAfterResponse.data.User.roles).toEqual(expect.not.arrayContaining([expect.objectContaining({ name: 'admin' })]))
        expect(oneUserAfterResponse.data.User.roles).toEqual(expect.not.arrayContaining([expect.objectContaining({ name: 'custom1' })]))
    })

    it('not remove admin role by himself', async () => {
        const adminToken = loginRes.data.login_v1.token
        const userRoleModel = server.entry.models['userRole']
        const [admin] = await Promise.all([userRoleModel.findOne({ name: 'admin' }).lean()])

        const oneUserBeforeResponse = await oneUserQuery(server, loginRes.data.login_v1.user.id, adminToken)
        expect(oneUserBeforeResponse).not.toHaveProperty('errors')
        expect(oneUserBeforeResponse.data.User).toHaveProperty('roles')
        expect(oneUserBeforeResponse.data.User.roles).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'admin' })]))
        expect(oneUserBeforeResponse.data.User.roles).toEqual(expect.not.arrayContaining([expect.objectContaining({ name: 'custom1' })]))

        // ///////////////////////////////////////////////////////////////////////////////////////////////////
        //                     ADD Admin role
        const addUserRoleToUserMutation = `mutation RemoveRoleFromUser($userId: ID!, $userRoleId: ID!) {
            removeRoleFromUser(userId: $userId, userRoleId: $userRoleId){
                userId
                userRoleId
                userModifiedCount
                userRoleModifiedCount
            }
        }`

        const addUserRoleToUserAdminResponse = await server.mutate(
            {
                mutation: addUserRoleToUserMutation,
                variables: {
                    userId: loginRes.data.login_v1.user.id,
                    userRoleId: admin._id.toString(),
                },
            },
            adminToken,
        )
        expect(addUserRoleToUserAdminResponse).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ message: 'Unlinking yourself from admin' })]))
        expect(addUserRoleToUserAdminResponse).not.toHaveProperty('data.removeRoleFromUser.userId', loginRes.data.login_v1.user.id)
        expect(addUserRoleToUserAdminResponse).not.toHaveProperty('data.removeRoleFromUser.userRoleId', admin._id.toString())
        expect(addUserRoleToUserAdminResponse).not.toHaveProperty('data.removeRoleFromUser.userModifiedCount', 1)
        expect(addUserRoleToUserAdminResponse).not.toHaveProperty('data.removeRoleFromUser.userModifiedCount', 1)

        const oneUserAfterResponse = await oneUserQuery(server, loginRes.data.login_v1.user.id, adminToken)
        expect(oneUserAfterResponse).not.toHaveProperty('errors')
        expect(oneUserAfterResponse.data.User).toHaveProperty('roles')
        expect(oneUserAfterResponse.data.User.roles).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'admin' })]))
        expect(oneUserAfterResponse.data.User.roles).toEqual(expect.not.arrayContaining([expect.objectContaining({ name: 'custom1' })]))
    })
})

export async function createModel1(server, token, dataIncoming = {}, relations = {}) {
    const data = {
        ...{
            name: 'Model1/name/9xdozt5',
            opt: 'Model1/opt/veuzo6fw',
            optInt: 178908,
            optFloat: 270263.47104221646,
            arrName: ['Model1/arrName/z16efwi', 'Model1/arrName/itt8ze0a', 'Model1/arrName/1hgi59zd'],
            arrInt: [841914, 706908, 381989],
            arrFloat: [981172.4638921468, 595172.7641393992, 950648.2557312585],
            optDateTime: '2020-02-24T23:09:16.338Z',
            model2Ids: [],
        },
        ...dataIncoming,
    }

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

    return [createModel1Response, data]
}

export async function createModel2(server, token, dataIncoming = {}, relations = {}) {
    const data = {
        ...{
            name: 'Model2/name/x38jdqjk',
            opt: 'Model2/opt/6s47179m',
            optFloat: 218101.0611238121,
            model1Id: undefined,
        },
        ...dataIncoming,
    }

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

    return [createModel2Response, data]
}

export async function oneUserQuery(server, id, token) {
    return queryOne(
        server,
        id,
        token,
        `query User($id: ID!){
        User(id: $id) {
            roles{name,users{id}id},id
        }
    }`,
    )
}

export async function oneModel1Query(server, id, token) {
    return queryOne(
        server,
        id,
        token,
        `query Model1($id: ID!){
        Model1(id: $id) {
            model2{name,model1{id},id},id
        }
    }`,
    )
}

export async function oneModel2Query(server, id, token) {
    return queryOne(
        server,
        id,
        token,
        `query Model2($id: ID!){
        Model2(id: $id) {
            model1{name,model2{id},id},id
        }
    }`,
    )
}

export async function queryOne(server, id, token, query) {
    return server.query(
        {
            query,
            variables: { id },
        },
        token,
    )
}
