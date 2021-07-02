import * as request from 'supertest'
import { firstToLower } from '../../common/utils'
import { disconnectFromServer, generateAndRunServerFromSchema, loadGraphQL } from './utils'

console.log = jest.fn()
console.debug = jest.fn()
console.warn = jest.fn()
console.info = jest.fn()
let serverPort = 1

function a() {}
// @all(filter:"user_every.id={{userId}}")
describe('protection integration', () => {
    describe.each([
        ['admin', { admin: true, user: false, public: false }, '', '', '', '', ''],
        ['user', { admin: true, user: true, public: false }, '@create("user")', '@update("owner")', '@remove("owner")', '@one("owner")', '@all("user")'],
        ['public', { admin: true, user: true, public: true }, '@create("public")', '@update("public")', '@remove("public")', '@one("public")', '@all("public")'],
    ])('protectedTo:%s', (protectedTo, allowedFor, createProtection, updateProtection, removeProtection, oneProtection, allProtection) => {
        let admin, user, server, keyName, model1, user2

        beforeAll(async () => {
            const port = 3010 + serverPort++
            keyName = `Model1${protectedTo}COUAR`
            const schema = `
            ${createProtection}
            ${updateProtection}
            ${removeProtection}
            ${updateProtection}
            ${oneProtection}
            ${allProtection}
            type ${keyName} @model {
                name: String!
            }
        `
            server = await generateAndRunServerFromSchema(`protection-${protectedTo}-COUAR`, schema, port)
            model1 = server.entry.models[firstToLower(keyName)]

            const loginQL = loadGraphQL('./services/backend/integration-tests/graphql/login/login.gql')

            const adminRes = await server.mutate({
                mutation: loginQL,
                variables: {
                    email: 'admin1',
                    pass: 'admin1',
                },
            })

            expect(adminRes).not.toHaveProperty('errors')
            expect(adminRes).toHaveProperty('data.login_v1.token')
            expect(adminRes).toHaveProperty('data.login_v1.refreshToken')
            expect(adminRes).toHaveProperty('data.login_v1.user.id')
            expect(adminRes).toHaveProperty('data.login_v1.user.email', 'admin1')
            expect(adminRes).toHaveProperty('data.login_v1.user.roles', [{ name: 'admin' }])

            const registerQL = loadGraphQL('./services/backend/integration-tests/graphql/login/register.gql')

            const userRes = await server.mutate({
                mutation: registerQL,
                variables: {
                    email: keyName,
                    pass: keyName,
                },
            })

            expect(userRes).not.toHaveProperty('errors')
            expect(userRes).toHaveProperty('data.register_v1.token')
            expect(userRes).toHaveProperty('data.register_v1.refreshToken')
            expect(userRes).toHaveProperty('data.register_v1.user.id')
            expect(userRes).toHaveProperty('data.register_v1.user.email', keyName)
            expect(userRes).toHaveProperty('data.register_v1.user.roles', [])

            const userRe2 = await server.mutate({
                mutation: registerQL,
                variables: {
                    email: keyName + '2',
                    pass: keyName + '2',
                },
            })

            expect(userRe2).not.toHaveProperty('errors')
            expect(userRe2).toHaveProperty('data.register_v1.token')
            expect(userRe2).toHaveProperty('data.register_v1.refreshToken')
            expect(userRe2).toHaveProperty('data.register_v1.user.id')
            expect(userRe2).toHaveProperty('data.register_v1.user.email', keyName + '2')
            expect(userRe2).toHaveProperty('data.register_v1.user.roles', [])

            admin = adminRes.data.login_v1
            user = userRes.data.register_v1
            user2 = userRe2.data.register_v1
        })

        afterAll(async () => {
            await disconnectFromServer(server)
        })

        describe.each([
            ['admin', allowedFor.admin, admin],
            ['user', allowedFor.user, user],
            ['public', allowedFor.public],
        ])('with:%s (%s)', (currentTokenName, allowed) => {
            it('create', async () => {
                const currentUser = (currentTokenName === 'admin' && admin) || (currentTokenName === 'user' && user)
                const mutate = {
                    mutation: `mutation CreateModel1($name: String!){
                    create${keyName}(name: $name) {
                       name,id,user{id}
                    }
                }`,
                    variables: {
                        name: 'aw45eso34me',
                    },
                }

                const data = await server.mutate(mutate, currentUser?.token)
                if (!allowed) {
                    expect(data).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ message: 'Unauthorized' })]))
                    return
                }

                expect(data).not.toHaveProperty('errors')
                expect(data).toHaveProperty(`data.create${keyName}`)
                expect(data).toHaveProperty(`data.create${keyName}.id`)
                expect(data).toHaveProperty(`data.create${keyName}.name`, 'aw45eso34me')
                if (currentUser?.token) {
                    expect(data).toHaveProperty(`data.create${keyName}.user.id`, currentUser?.user?.id)
                }
            })

            it('create with user2', async () => {
                const currentUser = (currentTokenName === 'admin' && admin) || (currentTokenName === 'user' && user)
                const mutate = {
                    mutation: `mutation CreateModel1($name: String!, $userId: ID){
                    create${keyName}(name: $name, userId: $userId) {
                       name,id,user{id}
                    }
                }`,
                    variables: {
                        name: 'user242xwr',
                        userId: user2.user.id,
                    },
                }

                const data = await server.mutate(mutate, currentUser?.token)
                if (!allowed) {
                    expect(data).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ message: 'Unauthorized' })]))
                    return
                }

                expect(data).not.toHaveProperty('errors')
                expect(data).toHaveProperty(`data.create${keyName}`)
                expect(data).toHaveProperty(`data.create${keyName}.id`)
                expect(data).toHaveProperty(`data.create${keyName}.name`, 'user242xwr')
                if (currentUser?.token) {
                    expect(data).toHaveProperty(`data.create${keyName}.user.id`, user2?.user?.id)
                }
            })

            it('update', async () => {
                const currentUser = (currentTokenName === 'admin' && admin) || (currentTokenName === 'user' && user)

                const created = await model1.create({ name: 'up4date45c', user: currentUser?.user?.id })
                const mutate = {
                    mutation: `mutation UpdateModel1($id: ID!, $name: String!){
                    update${keyName}(id:$id, name: $name) {
                       name,id,user{id}
                    }
                }`,
                    variables: {
                        name: 'upda12er15',
                        id: created._id.toString(),
                    },
                }

                const data = await server.mutate(mutate, currentUser?.token)
                if (!allowed) {
                    expect(data).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ message: 'Unauthorized' })]))
                    return
                } else {
                    expect(data).not.toHaveProperty('errors')
                    expect(data).toHaveProperty(`data.update${keyName}`)
                    expect(data).toHaveProperty(`data.update${keyName}.id`)
                    expect(data).toHaveProperty(`data.update${keyName}.name`, 'upda12er15')
                }

                if (currentUser?.token) {
                    expect(data).toHaveProperty(`data.update${keyName}.user.id`, currentUser?.user?.id)
                }

                // test if user 2 can edit
                const data2 = await server.mutate(mutate, user2?.token)
                if (protectedTo !== 'public') {
                    expect(data2).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ message: 'Unauthorized' })]))
                } else {
                    expect(data2).not.toHaveProperty('errors')
                }
            })

            it('update with owner change', async () => {
                const currentUser = (currentTokenName === 'admin' && admin) || (currentTokenName === 'user' && user)

                const created = await model1.create({ name: 'up4date45c2', user: currentUser?.user?.id })
                const mutate = {
                    mutation: `mutation UpdateModel1($id: ID!, $userId: ID){
                    update${keyName}(id:$id, userId: $userId) {
                       name,id,user{id}
                    }
                }`,
                    variables: {
                        userId: user2?.user.id,
                        id: created._id.toString(),
                    },
                }

                const data = await server.mutate(mutate, currentUser?.token)
                if (!allowed) {
                    expect(data).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ message: 'Unauthorized' })]))
                    // cant continue because the owner is not changed
                    return
                }

                expect(data).not.toHaveProperty('errors')
                expect(data).toHaveProperty(`data.update${keyName}`)
                expect(data).toHaveProperty(`data.update${keyName}.id`)
                expect(data).toHaveProperty(`data.update${keyName}.name`, 'up4date45c2')
                expect(data).toHaveProperty(`data.update${keyName}.user.id`, user2?.user?.id)

                // test if user 2 can edit IT should because is a owner now
                const data2 = await server.mutate(mutate, user2?.token)
                if (protectedTo === 'admin') {
                    // in admin owner doesn't make role
                    expect(data2).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ message: 'Unauthorized' })]))
                } else {
                    expect(data2).not.toHaveProperty('errors')
                }
            })

            it('remove', async () => {
                const currentUser = (currentTokenName === 'admin' && admin) || (currentTokenName === 'user' && user)

                const created1 = await model1.create({ name: 'rem28xwer1', user: currentUser?.user?.id })
                const created2 = await model1.create({ name: 'rem28xwer2', user: currentUser?.user?.id })
                const mutation = `mutation RemoveModel1($id: ID!){
                    remove${keyName}(id:$id) {
                       id
                    }
                }`

                const data = await server.mutate(
                    {
                        mutation,
                        variables: {
                            id: created1._id.toString(),
                        },
                    },
                    currentUser?.token,
                )

                if (!allowed) {
                    expect(data).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ message: 'Unauthorized' })]))
                } else {
                    expect(data).not.toHaveProperty('errors')
                    expect(data).toHaveProperty(`data.remove${keyName}`)
                    expect(data).toHaveProperty(`data.remove${keyName}.id`)
                    expect(await model1.exists({ _id: created1._id.toString() })).toEqual(false)
                }

                // test if user 2 can edit
                const data2 = await server.mutate(
                    {
                        mutation,
                        variables: {
                            id: created2._id.toString(),
                        },
                    },
                    user2?.token,
                )

                // with another user should be posible remove only in public mode
                if (protectedTo === 'public') {
                    expect(data2).not.toHaveProperty('errors')
                    expect(await model1.exists({ _id: created2._id.toString() })).toEqual(false)
                } else {
                    expect(data2).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ message: 'Unauthorized' })]))
                    expect(await model1.exists({ _id: created2._id.toString() })).toEqual(true)
                }
            })

            it('one', async () => {
                const currentUser = (currentTokenName === 'admin' && admin) || (currentTokenName === 'user' && user)

                const created1 = await model1.create({ name: 'rem28xwer1', user: currentUser?.user?.id })
                const query = `query Model1($id: ID!){
                    ${keyName}(id:$id) {
                        name,id,user{id}
                    }
                }`

                const data = await server.query(
                    {
                        query,
                        variables: {
                            id: created1._id.toString(),
                        },
                    },
                    currentUser?.token,
                )

                if (!allowed) {
                    expect(data).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ message: 'Unauthorized' })]))
                    return
                }

                expect(data).not.toHaveProperty('errors')
                expect(data).toHaveProperty(`data.${keyName}`)
                expect(data).toHaveProperty(`data.${keyName}.id`)
                expect(data).toHaveProperty(`data.${keyName}.name`, 'rem28xwer1')
                expect(data).toHaveProperty(`data.${keyName}.user.id`, currentUser?.user?.id)

                // test if user 2 can edit
                const data2 = await server.query(
                    {
                        query,
                        variables: {
                            id: created1._id.toString(),
                        },
                    },
                    user2?.token,
                )

                // with another user should be posible remove only in public mode
                if (protectedTo === 'public') {
                    expect(data2).not.toHaveProperty('errors')
                } else {
                    expect(data2).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ message: 'Unauthorized' })]))
                }
            })

            it('all', async () => {
                const currentUser = (currentTokenName === 'admin' && admin) || (currentTokenName === 'user' && user)

                const created1 = await model1.create({ name: 'all23xwer1', user: currentUser?.user?.id })
                const created2 = await model1.create({ name: 'all34xwer2', user: currentUser?.user?.id })
                const query = `query allModel1{
                    all${keyName} {
                        name,id,user{id}
                    }
                }`

                const data = await server.query(
                    {
                        query,
                    },
                    currentUser?.token,
                )

                if (!allowed) {
                    expect(data).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ message: 'Unauthorized' })]))
                    return
                }

                expect(data).not.toHaveProperty('errors')
                expect(data).toHaveProperty(`data.all${keyName}`)
                expect(data).toHaveProperty(
                    `data.all${keyName}`,
                    expect.arrayContaining([
                        expect.objectContaining({ name: 'all23xwer1', id: created1._id.toString() }),
                        expect.objectContaining({ name: 'all34xwer2', id: created2._id.toString() }),
                    ]),
                )
            })
        })
    })

    describe('special cases', () => {
        let admin, user, server, keyName, model1, user2
        const protectedTo = 'Filter'
        beforeAll(async () => {
            const port = 3030 + serverPort++
            keyName = `Model1${protectedTo}COUAR`
            const schema = `
            @all(filter:"user_every.id={{userId}}")
            type ${keyName} @model {
                name: String!
            }
        `
            server = await generateAndRunServerFromSchema(`protection-${protectedTo}-COUAR`, schema, port)
            model1 = server.entry.models[firstToLower(keyName)]

            const loginQL = loadGraphQL('./services/backend/integration-tests/graphql/login/login.gql')

            const adminRes = await server.mutate({
                mutation: loginQL,
                variables: {
                    email: 'admin1',
                    pass: 'admin1',
                },
            })

            expect(adminRes).not.toHaveProperty('errors')
            expect(adminRes).toHaveProperty('data.login_v1.token')
            expect(adminRes).toHaveProperty('data.login_v1.refreshToken')
            expect(adminRes).toHaveProperty('data.login_v1.user.id')
            expect(adminRes).toHaveProperty('data.login_v1.user.email', 'admin1')
            expect(adminRes).toHaveProperty('data.login_v1.user.roles', [{ name: 'admin' }])

            const registerQL = loadGraphQL('./services/backend/integration-tests/graphql/login/register.gql')

            const userRes = await server.mutate({
                mutation: registerQL,
                variables: {
                    email: keyName,
                    pass: keyName,
                },
            })

            expect(userRes).not.toHaveProperty('errors')
            expect(userRes).toHaveProperty('data.register_v1.token')
            expect(userRes).toHaveProperty('data.register_v1.refreshToken')
            expect(userRes).toHaveProperty('data.register_v1.user.id')
            expect(userRes).toHaveProperty('data.register_v1.user.email', keyName)
            expect(userRes).toHaveProperty('data.register_v1.user.roles', [])

            const userRe2 = await server.mutate({
                mutation: registerQL,
                variables: {
                    email: keyName + '2',
                    pass: keyName + '2',
                },
            })

            expect(userRe2).not.toHaveProperty('errors')
            expect(userRe2).toHaveProperty('data.register_v1.token')
            expect(userRe2).toHaveProperty('data.register_v1.refreshToken')
            expect(userRe2).toHaveProperty('data.register_v1.user.id')
            expect(userRe2).toHaveProperty('data.register_v1.user.email', keyName + '2')
            expect(userRe2).toHaveProperty('data.register_v1.user.roles', [])

            admin = adminRes.data.login_v1
            user = userRes.data.register_v1
            user2 = userRe2.data.register_v1
        })

        afterAll(async () => {
            await disconnectFromServer(server)
        })

        it.each([
            ['admin', true],
            ['user', true],
        ])('all with filter as %s', async (currentTokenName, allowed) => {
            const currentUser = (currentTokenName === 'admin' && admin) || (currentTokenName === 'user' && user)
            const created1 = await model1.create({ name: 'all23xwer1', user: currentUser?.user?.id })
            const created2 = await model1.create({ name: 'all34xwer2', user: currentUser?.user?.id })
            const created3 = await model1.create({ name: 'NOTall34xwer1', user: user2?.user?.id })
            const created4 = await model1.create({ name: 'NOTall34xwer2', user: user2?.user?.id })

            const query = `query allModel1($filter: ${keyName}Filter){
                all${keyName} (filter: $filter) {
                    name,id,user{id}
                }
            }`

            const data = await server.query(
                {
                    query,
                    variables: {
                        filter: {
                            user_every: { id: currentUser.user.id },
                        },
                    },
                },
                currentUser?.token,
            )

            if (!allowed) {
                expect(data).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ message: 'Unauthorized' })]))
                return
            }

            expect(data).not.toHaveProperty('errors')
            expect(data).toHaveProperty(`data.all${keyName}`)
            expect(data).toHaveProperty(
                `data.all${keyName}`,
                expect.arrayContaining([expect.objectContaining({ name: 'all23xwer1', id: created1._id.toString() }), expect.objectContaining({ name: 'all34xwer2', id: created2._id.toString() })]),
            )
            expect(data).toHaveProperty(
                `data.all${keyName}`,
                expect.not.arrayContaining([
                    expect.objectContaining({ name: 'NOTall34xwer1', id: created1._id.toString() }),
                    expect.objectContaining({ name: 'NOTall34xwer2', id: created2._id.toString() }),
                ]),
            )
        })

        it('all with admin without filter', async () => {
            const currentUser = admin
            const created1 = await model1.create({ name: 'all23xwer2', user: user?.user?.id })
            const created2 = await model1.create({ name: 'all34xwer3', user: user?.user?.id })
            const query = `query allModel1($filter: ${keyName}Filter){
                all${keyName} (filter: $filter) {
                    name,id,user{id}
                }
            }`

            const data = await server.query(
                {
                    query,
                },
                currentUser?.token,
            )

            expect(data).not.toHaveProperty('errors')
            expect(data).toHaveProperty(`data.all${keyName}`)
            expect(data).toHaveProperty(
                `data.all${keyName}`,
                expect.arrayContaining([expect.objectContaining({ name: 'all23xwer2', id: created1._id.toString() }), expect.objectContaining({ name: 'all34xwer3', id: created2._id.toString() })]),
            )
        })

        it('all with user without filter', async () => {
            const currentUser = user
            const created1 = await model1.create({ name: 'all23xwer2', user: user?.user?.id })
            const created2 = await model1.create({ name: 'all34xwer3', user: user?.user?.id })
            const query = `query allModel1($filter: ${keyName}Filter){
                all${keyName} (filter: $filter) {
                    name,id,user{id}
                }
            }`

            const data = await server.query(
                {
                    query,
                },
                currentUser?.token,
            )

            expect(data).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ message: 'Unauthorized' })]))
        })
    })
})
