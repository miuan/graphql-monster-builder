import * as request from 'supertest'
import { closeGeneratedServer, generateAndRunServerFromSchema, loadGraphQL } from './utils'

describe('integration', ()=>{

    describe('login', ()=>{
        let server;

        beforeAll(async ()=>{
            server = await generateAndRunServerFromSchema('login', `
                type Model1 @model {
                    name: String
                    model2: [Model2]! @relation(name: "Model1OnModel2")
                }

                type Model2 @model {
                    name: String
                    model1: Model1! @relation(name: "Model1OnModel2")
                }
            `)
            
        })

        afterAll(async () => {
            await closeGeneratedServer(server)
           });

        it('health check', async ()=>{
            // console.log(server)
            const response = await request(server.koa).get('/health');
            expect(response.status).toBe(200);
            expect(response.body).toEqual({health: 'ok'});
        })

        it('login fail', async ()=>{
            const loginQL = loadGraphQL('./services/backend/integration-tests/graphql/login/login.gql')
            
            const res = await server.mutate({
                mutation: loginQL,
                variables: { 
                    email: 'admin1',
                    pass: '123' 
                }
              });

            expect(res).not.toHaveProperty('data.login_v1.token')
            expect(res).toHaveProperty('errors')
        })

        it('login', async ()=>{
            const loginQL = loadGraphQL('./services/backend/integration-tests/graphql/login/login.gql')
            
            const res = await server.mutate({
                mutation: loginQL,
                variables: { 
                    email: 'admin1',
                    pass: 'admin1' 
                }
              });

            expect(res).toHaveProperty('data.login_v1.token')
            expect(res).not.toHaveProperty('errors')
        })

        it('register', async ()=>{
            const registerQL = loadGraphQL('./services/backend/integration-tests/graphql/login/register.gql')
            
            const res = await server.mutate({
                mutation: registerQL,
                variables: { 
                    email: 'user1',
                    pass: 'user1' 
                }
              });

            expect(res).toHaveProperty('data.register_v1.token')
            expect(res).not.toHaveProperty('errors')

            const loginQL = loadGraphQL('./services/backend/integration-tests/graphql/login/login.gql')
            
            const res2 = await server.mutate({
                mutation: loginQL,
                variables: { 
                    email: 'user1',
                    pass: 'user1' 
                }
              });

            expect(res2).toHaveProperty('data.login_v1.token')
            expect(res2).not.toHaveProperty('errors')
        })
    })
})




