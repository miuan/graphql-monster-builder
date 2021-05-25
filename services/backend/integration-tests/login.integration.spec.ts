import * as request from 'supertest'
import { closeGeneratedServer, generateAndRunServerFromSchema, loadGraphQL } from './utils'

describe('integration', ()=>{

    describe('login', ()=>{
        let server;

        beforeAll(async ()=>{
            server = await generateAndRunServerFromSchema('login', `
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
                    model2: [Model2] @relation(name: "Model1OnModel2")
                }

                type Model2 @model {
                    name: String!
                    opt: String
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
            expect(res).not.toHaveProperty('data.login_v1.refreshToken')
            expect(res).toHaveProperty('errors')
        })

        it.only('admin login', async ()=>{
            const loginQL = loadGraphQL('./services/backend/integration-tests/graphql/login/login.gql')
            
            const res = await server.mutate({
                mutation: loginQL,
                variables: { 
                    email: 'admin1',
                    pass: 'admin1' 
                }
              });

            expect(res).toHaveProperty('data.login_v1.token')
            expect(res).toHaveProperty('data.login_v1.refreshToken')
            expect(res).toHaveProperty('data.login_v1.user.id')
            expect(res).toHaveProperty('data.login_v1.user.email', 'admin1')
            expect(res).toHaveProperty('data.login_v1.user.roles', [{name: 'admin'}])
            expect(res).not.toHaveProperty('errors')


            const mutation = `mutation CreateModel1($name: String!,$opt: String,$optInt: Int,$optFloat: Float,$arrName: [String],$arrInt: [Int],$arrFloat: [Float],$optDateTime: DateTime,$model2s: [Model1model2Model2!]){
                createModel1(name: $name,opt: $opt,optInt: $optInt,optFloat: $optFloat,arrName: $arrName,arrInt: $arrInt,arrFloat: $arrFloat,optDateTime: $optDateTime,model2s: $model2s) {
                   name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,model2{id},id
                }
            }`
            
            const response = await server.mutate({
                mutation,
                variables: {
            "name": "Model1/name/lev33aau",
            "opt": "Model1/opt/oxqcxfir",
            "optInt": 851816,
            "optFloat": 379410.4644936933,
            "arrName": [
                "Model1/arrName/c9uzpq0h",
                "Model1/arrName/c1tie3to",
                "Model1/arrName/j1xhwhv"
            ],
            "arrInt": [
                2936948,
                7536839,
                3627175
            ],
            "arrFloat": [
                554447.3015951081,
                498096.30897671566,
                379455.6350167644
            ],
            "optDateTime": "2020-02-27T23:44:33.330Z"
        }
              }, res.data.login_v1.token);
        
            expect(response).not.toHaveProperty('errors')
        expect(response).toHaveProperty('data.createModel1.name', 'Model1/name/lev33aau')
        expect(response).toHaveProperty('data.createModel1.opt', 'Model1/opt/oxqcxfir')
        expect(response).toHaveProperty('data.createModel1.optInt', 851816)
        expect(response).toHaveProperty('data.createModel1.optFloat', 379410.4644936933)
        expect(response).toHaveProperty('data.createModel1.arrName', ['Model1/arrName/c9uzpq0h','Model1/arrName/c1tie3to','Model1/arrName/j1xhwhv'])
        expect(response).toHaveProperty('data.createModel1.arrInt', [2936948,7536839,3627175])
        expect(response).toHaveProperty('data.createModel1.arrFloat', [554447.3015951081,498096.30897671566,379455.6350167644])
        expect(response).toHaveProperty('data.createModel1.optDateTime', '2020-02-27T23:44:33.330Z')
        expect(response).toHaveProperty('data.createModel1.model2')
        expect(response).toHaveProperty('data.createModel1.id')
            
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
            expect(res).toHaveProperty('data.register_v1.refreshToken')
            expect(res).toHaveProperty('data.register_v1.user.id')
            expect(res).toHaveProperty('data.register_v1.user.email', 'user1')
            expect(res).toHaveProperty('data.register_v1.user.roles', [])
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
            expect(res2).toHaveProperty('data.login_v1.refreshToken')
            expect(res2).toHaveProperty('data.login_v1.user.id')
            expect(res2).toHaveProperty('data.login_v1.user.email', 'user1')
            expect(res2).toHaveProperty('data.login_v1.user.roles', [])
            expect(res2).not.toHaveProperty('errors')
        })
    })
})




