import * as request from 'supertest'
import { firstToLower, firstToUpper } from '../../common/utils'
import { disconnectFromServer, generateAndRunServerFromSchema, loadGraphQL } from './utils'

console.log = jest.fn()
console.debug = jest.fn()
console.warn = jest.fn()
console.info = jest.fn()
let serverPort = 1

// @all(filter:"user_every.id={{userId}}")
describe('i:protection', () => {
    describe.each([
        ['admin', { admin: true, user: false, public: false }, '', '', '', '', ''],
        ['user', { admin: true, user: true, public: false }, '@create("user")', '@update("owner")', '@remove("owner")', '@one("owner")', '@all("user")'],
        ['public', { admin: true, user: true, public: true }, '@create("public")', '@update("public")', '@remove("public")', '@one("public")', '@all("public")'],
    ])('protectedTo:%s', (protectedTo, allowedFor, createProtection, updateProtection, removeProtection, oneProtection, allProtection) => {
        let admin, user, server, keyName, emailName, model1, user2

        beforeAll(async () => {
            const port = 3010 + ++serverPort
            keyName = `Model1${firstToUpper(protectedTo)}Crud`
            emailName = `model1.${protectedTo}.couar`
            const schema = `
            ${createProtection}
            ${updateProtection}
            ${removeProtection}
            ${oneProtection}
            ${allProtection}
            type ${keyName} @model {
                name: String!
            }
        `
            server = await generateAndRunServerFromSchema(`protection_${protectedTo}_couar`, schema, port, 'test-protection-for-all')
            model1 = server.entry.models[firstToLower(keyName)]

            const loginQL = loadGraphQL('./services/backend/integration-tests/graphql/login/login.gql')

            const adminRes = await server.mutate({
                mutation: loginQL,
                variables: {
                    email: 'admin@admin.test',
                    pass: 'admin@admin.test',
                },
            })

            expect(adminRes).not.toHaveProperty('errors')
            expect(adminRes).toHaveProperty('data.login_v1.token')
            expect(adminRes).toHaveProperty('data.login_v1.refreshToken')
            expect(adminRes).toHaveProperty('data.login_v1.user.id')
            expect(adminRes).toHaveProperty('data.login_v1.user.email', 'admin@admin.test')
            expect(adminRes).toHaveProperty('data.login_v1.user.roles', [{ name: 'admin' }])

            const registerQL = loadGraphQL('./services/backend/integration-tests/graphql/login/register.gql')

            const userRes = await server.mutate({
                mutation: registerQL,
                variables: {
                    email: `${emailName}@graphql.mo`,
                    pass: `${emailName}@graphql.mo`,
                },
            })

            expect(userRes).not.toHaveProperty('errors')
            expect(userRes).toHaveProperty('data.register_v1.token')
            expect(userRes).toHaveProperty('data.register_v1.refreshToken')
            expect(userRes).toHaveProperty('data.register_v1.user.id')
            expect(userRes).toHaveProperty('data.register_v1.user.email', `${emailName}@graphql.mo`)
            expect(userRes).toHaveProperty('data.register_v1.user.roles', [])

            const userRe2 = await server.mutate({
                mutation: registerQL,
                variables: {
                    email: `${emailName}2@graphql.mo`,
                    pass: `${emailName}2@graphql.mo`,
                },
            })

            expect(userRe2).not.toHaveProperty('errors')
            expect(userRe2).toHaveProperty('data.register_v1.token')
            expect(userRe2).toHaveProperty('data.register_v1.refreshToken')
            expect(userRe2).toHaveProperty('data.register_v1.user.id')
            expect(userRe2).toHaveProperty('data.register_v1.user.email', `${emailName}2@graphql.mo`)
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
            it('should create [graphql]' + (allowed ? '[200]' : '[401]'), async () => {
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

            it('should create [api]' + (allowed ? '[200]' : '[401]'), async () => {
                const currentUser = (currentTokenName === 'admin' && admin) || (currentTokenName === 'user' && user)
                const data = await server.post(
                    `/api/${firstToLower(keyName)}`,
                    {
                        name: 'aw45eso45em',
                    },
                    currentUser?.token,
                )

                if (!allowed) {
                    expect(data).toHaveProperty('status', 401)
                    expect(data.body).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ name: 'Unauthorized' })]))
                    return
                }

                expect(data).toHaveProperty('status', 200)
                expect(data.body).toHaveProperty(`create${keyName}`)
                expect(data.body).toHaveProperty(`create${keyName}.id`)
                expect(data.body).toHaveProperty(`create${keyName}.name`, 'aw45eso45em')
                if (currentUser?.token) {
                    expect(data.body).toHaveProperty(`create${keyName}.user`, currentUser?.user?.id)
                }
            })

            it('should with user2 create [graphql]' + (allowed ? '[200]' : '[401]'), async () => {
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

            it('shoudl with user2 create [api]' + (allowed ? '[200]' : '[401]'), async () => {
                const currentUser = (currentTokenName === 'admin' && admin) || (currentTokenName === 'user' && user)
                const data = await server.post(
                    `/api/${firstToLower(keyName)}`,
                    {
                        name: 'aw45eso46em',
                        userId: user2.user.id,
                    },
                    currentUser?.token,
                )

                if (!allowed) {
                    expect(data).toHaveProperty('status', 401)
                    expect(data.body).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ name: 'Unauthorized' })]))
                    return
                }

                expect(data).toHaveProperty('status', 200)
                expect(data.body).toHaveProperty(`create${keyName}`)
                expect(data.body).toHaveProperty(`create${keyName}.id`)
                expect(data.body).toHaveProperty(`create${keyName}.name`, 'aw45eso46em')

                if (currentUser?.token) {
                    expect(data.body).toHaveProperty(`create${keyName}.user`, user2.user.id)
                }
            })

            it('should update [graphql]' + (allowed ? '[200]' : '[401]'), async () => {
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

            it('should update [api]' + (allowed ? '[200]' : '[401]'), async () => {
                const currentUser = (currentTokenName === 'admin' && admin) || (currentTokenName === 'user' && user)
                const created = await model1.create({ name: 'apiup4date45c', user: currentUser?.user?.id })
                const createId = created._id.toString()
                const data = await server.put(`/api/${firstToLower(keyName)}/${createId}`, { name: 'apiupda12er15' }, currentUser?.token)

                if (!allowed) {
                    expect(data).toHaveProperty('status', 401)
                    expect(data.body).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ name: 'Unauthorized' })]))
                    return
                }

                expect(data).toHaveProperty('status', 200)
                expect(data.body).toHaveProperty(`update${keyName}`)
                expect(data.body).toHaveProperty(`update${keyName}.id`, createId)
                expect(data.body).toHaveProperty(`update${keyName}.name`, 'apiupda12er15')
                if (currentUser?.token) {
                    expect(data.body).toHaveProperty(`update${keyName}.user`, currentUser?.user?.id)
                }
            })

            it('should update with owner change [graphql]' + (allowed ? '[200]' : '[401]'), async () => {
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

            it('should update with owner change [api]' + (allowed ? '[200]' : '[401]'), async () => {
                const currentUser = (currentTokenName === 'admin' && admin) || (currentTokenName === 'user' && user)
                const created = await model1.create({ name: 'apiup4date45c2', user: currentUser?.user?.id })
                const createId = created._id.toString()
                const data = await server.put(`/api/${firstToLower(keyName)}/${createId}`, { user: user2?.user.id }, currentUser?.token)

                if (!allowed) {
                    expect(data).toHaveProperty('status', 401)
                    expect(data.body).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ name: 'Unauthorized' })]))
                    return
                }

                expect(data).toHaveProperty('status', 200)
                expect(data.body).toHaveProperty(`update${keyName}`)
                expect(data.body).toHaveProperty(`update${keyName}.id`, createId)
                expect(data.body).toHaveProperty(`update${keyName}.name`, 'apiup4date45c2')
                if (currentUser?.token) {
                    expect(data.body).toHaveProperty(`update${keyName}.user`, user2?.user.id)
                }
            })

            it('should remove [graphql]' + (allowed ? '[200]' : '[401]'), async () => {
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

            it('should remove [api]' + (allowed ? '[200]' : '[401]'), async () => {
                const currentUser = (currentTokenName === 'admin' && admin) || (currentTokenName === 'user' && user)
                const created = await model1.create({ name: 'apirem28xwer1', user: currentUser?.user?.id })
                const createId = created._id.toString()
                const data = await server.delete(`/api/${firstToLower(keyName)}/${createId}`, {}, currentUser?.token)

                if (!allowed) {
                    expect(data).toHaveProperty('status', 401)
                    expect(data.body).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ name: 'Unauthorized' })]))
                    expect(await model1.exists({ _id: createId })).toEqual(true)
                    return
                }

                expect(data).toHaveProperty('status', 200)
                expect(data.body).toHaveProperty(`remove${keyName}`)
                expect(data.body).toHaveProperty(`remove${keyName}.id`, createId)
                expect(data.body).toHaveProperty(`remove${keyName}.name`, 'apirem28xwer1')
                expect(await model1.exists({ _id: createId })).toEqual(false)
                if (currentUser?.token) {
                    expect(data.body).toHaveProperty(`remove${keyName}.user`, currentUser?.user?.id)
                }
            })

            it('should read one [graphql]' + (allowed ? '[200]' : '[401]'), async () => {
                const currentUser = (currentTokenName === 'admin' && admin) || (currentTokenName === 'user' && user)

                const created1 = await model1.create({ name: 'rem28xwer2', user: currentUser?.user?.id })
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
                expect(data).toHaveProperty(`data.${keyName}.name`, 'rem28xwer2')
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

            it('should read on [api]' + (allowed ? '[200]' : '[401]'), async () => {
                const currentUser = (currentTokenName === 'admin' && admin) || (currentTokenName === 'user' && user)
                const created = await model1.create({ name: 'apirem28xwer2', user: currentUser?.user?.id })
                const createId = created._id.toString()
                const data = await server.get(`/api/${firstToLower(keyName)}/${createId}`, currentUser?.token)

                if (!allowed) {
                    expect(data).toHaveProperty('status', 401)
                    expect(data.body).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ name: 'Unauthorized' })]))
                    expect(await model1.exists({ _id: createId })).toEqual(true)
                    return
                }

                expect(data).toHaveProperty('status', 200)
                expect(data.body).toHaveProperty(`${firstToLower(keyName)}`)
                expect(data.body).toHaveProperty(`${firstToLower(keyName)}.id`, createId)
                expect(data.body).toHaveProperty(`${firstToLower(keyName)}.name`, 'apirem28xwer2')

                if (currentUser?.token) {
                    expect(data.body).toHaveProperty(`${firstToLower(keyName)}.user`, currentUser?.user?.id)
                }
            })

            it('should all [graphql]' + (allowed ? '[200]' : '[401]'), async () => {
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

            it('should all [api]' + (allowed ? '[200]' : '[401]'), async () => {
                const currentUser = (currentTokenName === 'admin' && admin) || (currentTokenName === 'user' && user)

                const created1 = await model1.create({ name: 'apiall23xwer1', user: currentUser?.user?.id })
                const created2 = await model1.create({ name: 'apiall34xwer2', user: currentUser?.user?.id })
                const data = await server.get(`/api/${firstToLower(keyName)}/all`, currentUser?.token)

                if (!allowed) {
                    expect(data).toHaveProperty('status', 401)
                    expect(data.body).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ name: 'Unauthorized' })]))
                    return
                }

                expect(data).not.toHaveProperty('errors')
                expect(data).toHaveProperty(`body.all${keyName}`)
                expect(data).toHaveProperty(
                    `body.all${keyName}`,
                    expect.arrayContaining([
                        expect.objectContaining({ name: 'apiall23xwer1', id: created1._id.toString() }),
                        expect.objectContaining({ name: 'apiall34xwer2', id: created2._id.toString() }),
                    ]),
                )
            })

            it('should dcount [graph]' + (allowed ? '[200]' : '[401]'), async () => {
                const currentUser = (currentTokenName === 'admin' && admin) || (currentTokenName === 'user' && user)
                const userFilterKey = protectedTo + '_gql_count_' + currentTokenName + '_'
                const created1 = await model1.create({ name: userFilterKey + 'all23xwer3', user: currentUser?.user?.id })
                const created2 = await model1.create({ name: userFilterKey + 'all34xwer4', user: currentUser?.user?.id })
                const query = `query countModel1{
                    count${keyName}(filter:{name_starts_with:"${userFilterKey}"})
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
                expect(data).toHaveProperty(`data.count${keyName}`, 2)
            })

            it('should count [api]' + (allowed ? '[200]' : '[401]'), async () => {
                const currentUser = (currentTokenName === 'admin' && admin) || (currentTokenName === 'user' && user)

                const userFilterKey = protectedTo + '_api_count_' + currentTokenName + '_'
                const userFilterKey2 = protectedTo + '_api_count_2' + currentTokenName + '2_'
                const created1 = await model1.create({ name: userFilterKey + 'apiall23xwer01', user: currentUser?.user?.id })
                const created2 = await model1.create({ name: userFilterKey + 'apiall34xwer02', user: currentUser?.user?.id })
                const created3 = await model1.create({ name: userFilterKey2 + 'apiall34xwer03', user: currentUser?.user?.id })
                const data = await server.get(`/api/${firstToLower(keyName)}/count?filter={name_starts_with:"${userFilterKey}"}`, currentUser?.token)

                if (!allowed) {
                    expect(data).toHaveProperty('status', 401)
                    expect(data.body).toHaveProperty('errors', expect.arrayContaining([expect.objectContaining({ name: 'Unauthorized' })]))
                    return
                }

                expect(data).not.toHaveProperty('errors')
                expect(data).toHaveProperty(`body.count${keyName}`, 2)

                const data2 = await server.get(`/api/${firstToLower(keyName)}/count?filter={name_starts_with:"${userFilterKey2}"}`, currentUser?.token)
                expect(data2).not.toHaveProperty('errors')
                expect(data2).toHaveProperty(`body.count${keyName}`, 1)
            })
        })
    })

    describe('special cases', () => {
        let admin, user, server, keyName, model1, user2, emailName
        const protectedTo = 'Filter'
        beforeAll(async () => {
            const port = 3030 + serverPort++
            keyName = `Model1${firstToUpper(protectedTo)}Couar`
            emailName = `model1.${protectedTo}.couar`
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
                    email: 'admin@admin.test',
                    pass: 'admin@admin.test',
                },
            })

            expect(adminRes).not.toHaveProperty('errors')
            expect(adminRes).toHaveProperty('data.login_v1.token')
            expect(adminRes).toHaveProperty('data.login_v1.refreshToken')
            expect(adminRes).toHaveProperty('data.login_v1.user.id')
            expect(adminRes).toHaveProperty('data.login_v1.user.email', 'admin@admin.test')
            expect(adminRes).toHaveProperty('data.login_v1.user.roles', [{ name: 'admin' }])

            const registerQL = loadGraphQL('./services/backend/integration-tests/graphql/login/register.gql')

            const userRes = await server.mutate({
                mutation: registerQL,
                variables: {
                    email: `${emailName}@graphql.mo`,
                    pass: `${emailName}@graphql.mo`,
                },
            })

            expect(userRes).not.toHaveProperty('errors')
            expect(userRes).toHaveProperty('data.register_v1.token')
            expect(userRes).toHaveProperty('data.register_v1.refreshToken')
            expect(userRes).toHaveProperty('data.register_v1.user.id')
            expect(userRes).toHaveProperty('data.register_v1.user.email', `${emailName}@graphql.mo`)
            expect(userRes).toHaveProperty('data.register_v1.user.roles', [])

            const userRe2 = await server.mutate({
                mutation: registerQL,
                variables: {
                    email: `${emailName}.25@graphql.mo`,
                    pass: `${emailName}.25@graphql.mo`,
                },
            })

            expect(userRe2).not.toHaveProperty('errors')
            expect(userRe2).toHaveProperty('data.register_v1.token')
            expect(userRe2).toHaveProperty('data.register_v1.refreshToken')
            expect(userRe2).toHaveProperty('data.register_v1.user.id')
            expect(userRe2).toHaveProperty('data.register_v1.user.email', `${emailName}.25@graphql.mo`)
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
