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

        it('login', async ()=>{
            const loginQL = loadGraphQL('./services/backend/integration-tests/graphql/login/login.gql');
            //const loginQL = loader('./builder/services/backend/integration-tests/graphql/login/login.gql')
            
            const res = await server.mutate({
                mutation: loginQL,
                variables: { 
                    email: 'admin1',
                    pass: 'admin1' 
                }
              });

            expect(res).toHaveProperty('token', '123')
        })
    })
})




