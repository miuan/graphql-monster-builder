import * as request from 'supertest'
import { disconnectFromServer, generateAndRunServerFromSchema, loadGraphQL } from './utils'

console.log = jest.fn()
console.debug = jest.fn()
console.warn = jest.fn()
console.info = jest.fn()

describe.skip('protection integration', () => {
    let serverPort = 1
    describe.each([
        ['admin', ''],
        ['user', '@create("owner")'],
        ['unknown', '@create("public")'],
    ])('create:%s', (createProtectionName, createProtection) => {
        describe.each([
            ['admin', ''],
            ['user', '@update("owner")'],
            ['unknown', '@update("public")'],
        ])('update:%s', (updateProtectionName, updateProtection) => {
            describe.each([
                ['admin', ''],
                ['user', '@update("owner")'],
                ['unknown', '@update("public")'],
            ])('remove:%s', (removeProtectionName, removeProtection) => {
                describe.each([
                    ['admin', ''],
                    ['user', '@update("owner")'],
                    ['unknown', '@update("public")'],
                ])('one:%s', (oneProtectionName, oneProtection) => {
                    describe.each([
                        ['admin', ''],
                        ['user', '@update("owner")'],
                        ['unknown', '@update("public")'],
                    ])('all:%s', (allProtectionName, allProtection) => {
                        let server
                        let admin
                        let user

                        beforeAll(async () => {
                            server = await generateAndRunServerFromSchema(
                                `protection-${createProtectionName}C-${updateProtectionName}U-${removeProtectionName}R-${oneProtectionName}O-${allProtectionName}A`,
                                `
                    ${createProtection}
                    ${updateProtection}
                    type Model1 @model {
                        name: String!
                    }
                `,
                                3010 + serverPort++,
                            )

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

                            admin = adminRes.login_v1

                            const registerQL = loadGraphQL('./services/backend/integration-tests/graphql/login/register.gql')

                            const userRes = await server.mutate({
                                mutation: registerQL,
                                variables: {
                                    email: 'user1',
                                    pass: 'user1',
                                },
                            })

                            expect(userRes).not.toHaveProperty('errors')
                            expect(userRes).toHaveProperty('data.register_v1.token')
                            expect(userRes).toHaveProperty('data.register_v1.refreshToken')
                            expect(userRes).toHaveProperty('data.register_v1.user.id')
                            expect(userRes).toHaveProperty('data.register_v1.user.email', 'user1')
                            expect(userRes).toHaveProperty('data.register_v1.user.roles', [])

                            admin = adminRes.login_v1
                            user = userRes.register_v1
                        })

                        afterAll(async () => {
                            await disconnectFromServer(server)
                        })

                        it('create Model1', async () => {})
                    })
                })
            })
        })
    })
})
