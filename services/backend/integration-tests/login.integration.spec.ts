import * as request from 'supertest'
import { isExportDeclaration } from 'typescript'
import { disconnectFromServer, generateAndRunServerFromSchema, loadGraphQL } from './utils'

describe('integration', () => {
    describe('login', () => {
        let server
        let spyOnSendMail
        let userModel

        beforeAll(async () => {
            server = await generateAndRunServerFromSchema(
                'login',
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
                    model2: [@relation(name: "Model1OnModel2")]
                }

                type Model2 @model {
                    name: String!
                    opt: String
                    optFloat: Float
                    model1: @relation(name: "Model1OnModel2")
                }
            `,
            )

            spyOnSendMail = jest.spyOn(server.entry['email'], 'sendMail').mockImplementation(() => {})
            userModel = server.entry.models['user']
        })

        beforeEach(() => {
            spyOnSendMail.mockReset()
        })

        afterAll(async () => {
            spyOnSendMail.mockRestore()
            await disconnectFromServer(server)
        })

        it('health check', async () => {
            // console.log(server)
            const response = await request(server.koa).get('/health')
            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty('health', 'ok')
        })

        it('login fail', async () => {
            const loginQL = loadGraphQL('./services/backend/integration-tests/graphql/login/login.gql')

            const res = await server.mutate({
                mutation: loginQL,
                variables: {
                    email: 'admin@admin.test',
                    pass: '123',
                },
            })

            expect(res).not.toHaveProperty('data.login_v1.token')
            expect(res).not.toHaveProperty('data.login_v1.refreshToken')
            expect(res).toHaveProperty('errors')
        })

        it('admin login', async () => {
            const loginQL = loadGraphQL('./services/backend/integration-tests/graphql/login/login.gql')

            const res = await server.mutate({
                mutation: loginQL,
                variables: {
                    email: 'admin@admin.test',
                    pass: 'admin@admin.test',
                },
            })

            expect(res).toHaveProperty('data.login_v1.token')
            expect(res.data.login_v1.token).toMatch(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/)
            expect(res).toHaveProperty('data.login_v1.refreshToken')
            expect(res).toHaveProperty('data.login_v1.user.id')
            expect(res).toHaveProperty('data.login_v1.user.email', 'admin@admin.test')
            expect(res).toHaveProperty('data.login_v1.user.roles', [{ name: 'admin' }])
            expect(res).not.toHaveProperty('errors')

            const createModel1Mutation = `mutation CreateModel1($name: String!,$opt: String,$optInt: Int,$optFloat: Float,$arrName: [String],$arrInt: [Int],$arrFloat: [Float],$optDateTime: DateTime,$model2: [InModel1MemberModel2AsModel2!],$model2Ids: [ID!]){
            createModel1(name: $name,opt: $opt,optInt: $optInt,optFloat: $optFloat,arrName: $arrName,arrInt: $arrInt,arrFloat: $arrFloat,optDateTime: $optDateTime,model2: $model2, model2Ids: $model2Ids) {
               name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,model2{name,opt,optFloat,model1{id},id},id
            }
        }`

            const createModel1Response = await server.mutate(
                {
                    mutation: createModel1Mutation,
                    variables: {
                        name: 'Model1/name/g864fds4',
                    },
                },
                res.data.login_v1.token,
            )

            expect(createModel1Response).not.toHaveProperty('errors')
            expect(createModel1Response).toHaveProperty('data.createModel1.name', 'Model1/name/g864fds4')
            expect(createModel1Response).toHaveProperty('data.createModel1.id')

            const oneModel1Query = `query Model1($id: ID!){
        Model1(id: $id) {
            name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,model2{name,opt,optFloat,model1{id},id},id
        }
    }`

            const oneModel1Response = await server.query(
                {
                    query: oneModel1Query,
                    variables: { id: createModel1Response.data.createModel1.id },
                },
                res.data.login_v1.token,
            )

            expect(oneModel1Response).not.toHaveProperty('errors')
            expect(oneModel1Response).toHaveProperty('data.Model1.name', createModel1Response.data.createModel1.name)
            expect(oneModel1Response).toHaveProperty('data.Model1.id', createModel1Response.data.createModel1.id)
        })

        it('register', async () => {
            const registerQL = loadGraphQL('./services/backend/integration-tests/graphql/login/register.gql')
            const res = await server.mutate({
                mutation: registerQL,
                variables: {
                    email: 'createdUser@createdUser33yhlzcf.com',
                    pass: 'user1',
                },
            })

            expect(res).not.toHaveProperty('errors')
            expect(res).toHaveProperty('data.register_v1.token')
            expect(res).toHaveProperty('data.register_v1.refreshToken')
            expect(res).toHaveProperty('data.register_v1.user.id')
            expect(res).toHaveProperty('data.register_v1.user.email', 'createdUser@createdUser33yhlzcf.com')
            expect(res).toHaveProperty('data.register_v1.user.roles', [])

            // CHECK if correct email was sent
            const userBeforeResetPassword = await userModel.findOne({ email: 'createdUser@createdUser33yhlzcf.com' }).lean()
            expect(userBeforeResetPassword.__verifyToken).toBeDefined()

            expect(spyOnSendMail).toBeCalledTimes(1)
            expect(spyOnSendMail.mock.calls[0][1]).toEqual('createdUser@createdUser33yhlzcf.com')
            expect(spyOnSendMail.mock.calls[0][2]).toMatch(/Wellcome in/g)
            expect(spyOnSendMail.mock.calls[0][3]).toMatch(new RegExp(`<a href="undefined/email/${userBeforeResetPassword.__verifyToken}/verify"`, 'g'))

            // TEST LOGIN with created user1
            const loginQL = loadGraphQL('./services/backend/integration-tests/graphql/login/login.gql')
            const res2 = await server.mutate({
                mutation: loginQL,
                variables: {
                    email: 'createdUser@createdUser33yhlzcf.com',
                    pass: 'user1',
                },
            })

            expect(res2).toHaveProperty('data.login_v1.token')
            expect(res2).toHaveProperty('data.login_v1.refreshToken')
            expect(res2).toHaveProperty('data.login_v1.user.id')
            expect(res2).toHaveProperty('data.login_v1.user.email', 'createdUser@createdUser33yhlzcf.com')
            expect(res2).toHaveProperty('data.login_v1.user.roles', [])
            expect(res2).not.toHaveProperty('errors')
        })

        it('should not register a email in wrong format', async () => {
            const registerQL = loadGraphQL('./services/backend/integration-tests/graphql/login/register.gql')
            const res = await server.mutate({
                mutation: registerQL,
                variables: {
                    email: 'createdUser.com',
                    pass: 'user1',
                },
            })

            expect(res).toHaveProperty('errors')
            expect(res).not.toHaveProperty('data.register_v1.token')
            expect(res).not.toHaveProperty('data.register_v1.refreshToken')
            expect(res).not.toHaveProperty('data.register_v1.user.id')
        })

        it('forgotten password request', async () => {
            const registerQL = loadGraphQL('./services/backend/integration-tests/graphql/login/register.gql')
            const regRes = await server.mutate({
                mutation: registerQL,
                variables: {
                    email: 'userWithLostPass@userWithLostPass90yhlzxw.com',
                    pass: 'userWithLostPass1',
                },
            })

            spyOnSendMail.mockReset()

            // CREATE REQUEST
            const forgottenPasswordRequest = loadGraphQL('./services/backend/integration-tests/graphql/login/forgotten-password-request.gql')
            const res = await server.mutate({
                mutation: forgottenPasswordRequest,
                variables: {
                    email: 'userWithLostPass@userWithLostPass90yhlzxw.com',
                },
            })

            expect(res).not.toHaveProperty('errors')
            expect(res).toHaveProperty('data.forgottenPassword_v1.email')
            expect(res).toHaveProperty('data.forgottenPassword_v1.status', 'sent')

            // CHECK if correct email was sent
            const userBeforeResetPassword = await userModel.findOne({ email: 'userWithLostPass@userWithLostPass90yhlzxw.com' }).lean()
            expect(userBeforeResetPassword.__resetPasswordToken).toBeDefined()

            expect(spyOnSendMail).toBeCalledTimes(1)
            expect(spyOnSendMail.mock.calls[0][1]).toEqual('userWithLostPass@userWithLostPass90yhlzxw.com')
            expect(spyOnSendMail.mock.calls[0][2]).toMatch(/Change password/g)
            expect(spyOnSendMail.mock.calls[0][3]).toMatch(new RegExp(`<a href="undefined/forgotten-password/${userBeforeResetPassword.__resetPasswordToken}"`, 'g'))

            // CHECK IF check worrks
            const forgottenPasswordCheck = loadGraphQL('./services/backend/integration-tests/graphql/login/forgotten-password-check.gql')
            const forgottenPasswordCheckRes = await server.mutate({
                mutation: forgottenPasswordCheck,
                variables: {
                    token: userBeforeResetPassword.__resetPasswordToken,
                },
            })

            expect(forgottenPasswordCheckRes).not.toHaveProperty('errors')
            expect(forgottenPasswordCheckRes).toHaveProperty('data.check.status', 'valid')

            // CHECK IF reset works
            const forgottenPasswordReset = loadGraphQL('./services/backend/integration-tests/graphql/login/forgotten-password-reset.gql')
            const forgottenPasswordResetRes = await server.mutate({
                mutation: forgottenPasswordReset,
                variables: {
                    token: userBeforeResetPassword.__resetPasswordToken,
                    password: 'userWithLostPass2',
                },
            })

            expect(forgottenPasswordResetRes).not.toHaveProperty('errors')
            expect(forgottenPasswordResetRes).toHaveProperty('data.reset.token')
            expect(forgottenPasswordResetRes.data.reset.token).toMatch(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/)
            expect(forgottenPasswordResetRes).toHaveProperty('data.reset.refreshToken')
            expect(forgottenPasswordResetRes).toHaveProperty('data.reset.user.email', 'userWithLostPass@userWithLostPass90yhlzxw.com')

            const userAfterChangePass = await userModel.findOne({ email: 'userWithLostPass@userWithLostPass90yhlzxw.com' }).lean()
            expect(userAfterChangePass.__resetPasswordToken).not.toBeDefined()
            expect(userAfterChangePass.__password).not.toEqual(userBeforeResetPassword.__password)

            // CHECK IF reset pass works for login
            const loginQL = loadGraphQL('./services/backend/integration-tests/graphql/login/login.gql')
            const loginRes = await server.mutate({
                mutation: loginQL,
                variables: {
                    email: 'userWithLostPass@userWithLostPass90yhlzxw.com',
                    pass: 'userWithLostPass2',
                },
            })
            expect(loginRes).not.toHaveProperty('errors')
            expect(loginRes).toHaveProperty('data.login_v1.token')
            expect(loginRes.data.login_v1.token).toMatch(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/)
        })

        it('forgotten password check with WRONG token', async () => {
            const forgottenPasswordCheck = loadGraphQL('./services/backend/integration-tests/graphql/login/forgotten-password-check.gql')
            const forgottenPasswordCheckWrongRes = await server.mutate({
                mutation: forgottenPasswordCheck,
                variables: {
                    token: `wrong token`,
                },
            })

            expect(forgottenPasswordCheckWrongRes).toHaveProperty('errors')
            expect(forgottenPasswordCheckWrongRes.errors[0].message).toMatch(/'wrong token' is not valid/)
            expect(forgottenPasswordCheckWrongRes).not.toHaveProperty('data.check.status')
        })

        it('forgotten password reset with WRONG token', async () => {
            const forgottenPasswordReset = loadGraphQL('./services/backend/integration-tests/graphql/login/forgotten-password-reset.gql')
            const forgottenPasswordResetRes = await server.mutate({
                mutation: forgottenPasswordReset,
                variables: {
                    token: `wrong token`,
                    password: 'userWithLostPass3',
                },
            })

            expect(forgottenPasswordResetRes).toHaveProperty('errors')
            expect(forgottenPasswordResetRes).not.toHaveProperty('data.reset.token')
            expect(forgottenPasswordResetRes).not.toHaveProperty('data.reset.refreshToken')
            expect(forgottenPasswordResetRes).not.toHaveProperty('data.reset.user.email')
        })
    })

    describe('register with extended user data', () => {
        let server
        let spyOnSendMail
        let userModel

        beforeAll(async () => {
            server = await generateAndRunServerFromSchema(
                'login-extended-user',
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
                    model2: [@relation(name: "Model1OnModel2")]
                }

                type Model2 @model {
                    name: String!
                    opt: String
                    optFloat: Float
                    model1: @relation(name: "Model1OnModel2")
                }

                type User @model {
                    firstname: String! @regExp("^[a-zA-Z]{3,}$")
                    lastname: String! @regExp("^[a-zA-Z]{3,}$")
                }
            `,
            )

            spyOnSendMail = jest.spyOn(server.entry['email'], 'sendMail').mockImplementation(() => {})
            userModel = server.entry.models['user']
        })

        beforeEach(() => {
            spyOnSendMail.mockReset()
        })

        afterAll(async () => {
            spyOnSendMail.mockRestore()
            await disconnectFromServer(server)
        })

        it('health check', async () => {
            // console.log(server)
            const response = await request(server.koa).get('/health')
            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty('health', 'ok')
        })

        it('login fail', async () => {
            const loginQL = loadGraphQL('./services/backend/integration-tests/graphql/login/login.gql')

            const res = await server.mutate({
                mutation: loginQL,
                variables: {
                    email: 'admin@admin.test',
                    pass: '123',
                },
            })

            expect(res).not.toHaveProperty('data.login_v1.token')
            expect(res).not.toHaveProperty('data.login_v1.refreshToken')
            expect(res).toHaveProperty('errors')
        })

        it('admin login', async () => {
            const loginQL = loadGraphQL('./services/backend/integration-tests/graphql/login/login.gql')

            const res = await server.mutate({
                mutation: loginQL,
                variables: {
                    email: 'admin@admin.test',
                    pass: 'admin@admin.test',
                },
            })

            expect(res).toHaveProperty('data.login_v1.token')
            expect(res.data.login_v1.token).toMatch(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/)
            expect(res).toHaveProperty('data.login_v1.refreshToken')
            expect(res).toHaveProperty('data.login_v1.user.id')
            expect(res).toHaveProperty('data.login_v1.user.email', 'admin@admin.test')
            expect(res).toHaveProperty('data.login_v1.user.roles', [{ name: 'admin' }])
            expect(res).not.toHaveProperty('errors')

            const createModel1Mutation = `mutation CreateModel1($name: String!,$opt: String,$optInt: Int,$optFloat: Float,$arrName: [String],$arrInt: [Int],$arrFloat: [Float],$optDateTime: DateTime,$model2: [InModel1MemberModel2AsModel2!],$model2Ids: [ID!]){
            createModel1(name: $name,opt: $opt,optInt: $optInt,optFloat: $optFloat,arrName: $arrName,arrInt: $arrInt,arrFloat: $arrFloat,optDateTime: $optDateTime,model2: $model2, model2Ids: $model2Ids) {
               name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,model2{name,opt,optFloat,model1{id},id},id
            }
        }`

            const createModel1Response = await server.mutate(
                {
                    mutation: createModel1Mutation,
                    variables: {
                        name: 'Model1/name/g864fds4',
                    },
                },
                res.data.login_v1.token,
            )

            expect(createModel1Response).not.toHaveProperty('errors')
            expect(createModel1Response).toHaveProperty('data.createModel1.name', 'Model1/name/g864fds4')
            expect(createModel1Response).toHaveProperty('data.createModel1.id')

            const oneModel1Query = `query Model1($id: ID!){
        Model1(id: $id) {
            name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,model2{name,opt,optFloat,model1{id},id},id
        }
    }`

            const oneModel1Response = await server.query(
                {
                    query: oneModel1Query,
                    variables: { id: createModel1Response.data.createModel1.id },
                },
                res.data.login_v1.token,
            )

            expect(oneModel1Response).not.toHaveProperty('errors')
            expect(oneModel1Response).toHaveProperty('data.Model1.name', createModel1Response.data.createModel1.name)
            expect(oneModel1Response).toHaveProperty('data.Model1.id', createModel1Response.data.createModel1.id)
        })

        it('register', async () => {
            const registerQL = loadGraphQL('./services/backend/integration-tests/graphql/login/register-extended.gql')
            const res = await server.mutate({
                mutation: registerQL,
                variables: {
                    firstname: 'Milan',
                    lastname: 'Medlik',
                    email: 'createdUser@createdUser44yhlzfc.com',
                    pass: 'user1',
                },
            })

            expect(res).not.toHaveProperty('errors')
            expect(res).toHaveProperty('data.register_v1.token')
            expect(res).toHaveProperty('data.register_v1.refreshToken')
            expect(res).toHaveProperty('data.register_v1.user.id')
            expect(res).toHaveProperty('data.register_v1.user.email', 'createdUser@createdUser44yhlzfc.com')
            expect(res).toHaveProperty('data.register_v1.user.firstname', 'Milan')
            expect(res).toHaveProperty('data.register_v1.user.lastname', 'Medlik')
            expect(res).toHaveProperty('data.register_v1.user.roles', [])

            // CHECK if correct email was sent
            const userBeforeResetPassword = await userModel.findOne({ email: 'createdUser@createdUser44yhlzfc.com' }).lean()
            expect(userBeforeResetPassword.__verifyToken).toBeDefined()
            expect(userBeforeResetPassword.firstname).toEqual('Milan')
            expect(userBeforeResetPassword.lastname).toEqual('Medlik')

            expect(spyOnSendMail).toBeCalledTimes(1)
            expect(spyOnSendMail.mock.calls[0][1]).toEqual('createdUser@createdUser44yhlzfc.com')
            expect(spyOnSendMail.mock.calls[0][2]).toMatch(/Wellcome in/g)
            expect(spyOnSendMail.mock.calls[0][3]).toMatch(new RegExp(`<a href="undefined/email/${userBeforeResetPassword.__verifyToken}/verify"`, 'g'))

            // TEST LOGIN with created user1
            const loginQL = loadGraphQL('./services/backend/integration-tests/graphql/login/login-extended.gql')
            const res2 = await server.mutate({
                mutation: loginQL,
                variables: {
                    email: 'createdUser@createdUser44yhlzfc.com',
                    pass: 'user1',
                },
            })

            expect(res2).toHaveProperty('data.login_v1.token')
            expect(res2).toHaveProperty('data.login_v1.refreshToken')
            expect(res2).toHaveProperty('data.login_v1.user.id')
            expect(res2).toHaveProperty('data.login_v1.user.email', 'createdUser@createdUser44yhlzfc.com')
            expect(res2).toHaveProperty('data.login_v1.user.firstname', 'Milan')
            expect(res2).toHaveProperty('data.login_v1.user.lastname', 'Medlik')
            expect(res2).toHaveProperty('data.login_v1.user.roles', [])
            expect(res2).not.toHaveProperty('errors')
        })

        it('should not register if firstname is in wrong format', async () => {
            const registerQL = loadGraphQL('./services/backend/integration-tests/graphql/login/register-extended.gql')
            const res = await server.mutate({
                mutation: registerQL,
                variables: {
                    email: 'createdUser.com',
                    pass: 'user1',
                    firstname: 'Mi',
                    lastname: 'Medlik',
                },
            })

            expect(res).toHaveProperty('errors')
            expect(res.errors[0].message).toMatch(/The firstname should match RegExp/)
            expect(res).not.toHaveProperty('data.register_v1.token')
            expect(res).not.toHaveProperty('data.register_v1.refreshToken')
            expect(res).not.toHaveProperty('data.register_v1.user.id')
        })
    })
})
