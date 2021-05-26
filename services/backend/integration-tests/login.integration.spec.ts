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
                    optFloat: Float
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

            
            const mutation = `mutation CreateModel1($name: String!,$opt: String,$optInt: Int,$optFloat: Float,$arrName: [String],$arrInt: [Int],$arrFloat: [Float],$optDateTime: DateTime,$model2: [InModel1MemberModel2AsModel2!]){
                createModel1(name: $name,opt: $opt,optInt: $optInt,optFloat: $optFloat,arrName: $arrName,arrInt: $arrInt,arrFloat: $arrFloat,optDateTime: $optDateTime,model2: $model2) {
                   name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,model2{name,opt,optFloat,model1{id},id},id
                }
            }`
            
            const response = await server.mutate({
                mutation,
                variables: {
            "name": "Model1/name/jrqkvwo",
            "opt": "Model1/opt/ym2aq8mt",
            "optInt": 452820,
            "optFloat": 714162.0109180656,
            "arrName": [
                "Model1/arrName/v1tpmv7",
                "Model1/arrName/7z0pmdic",
                "Model1/arrName/5o0opaht"
            ],
            "arrInt": [
                5283575,
                5906008,
                976230
            ],
            "arrFloat": [
                71985.43736315433,
                894989.3636426063,
                294900.862524188
            ],
            "optDateTime": "2021-05-22T22:12:41.424Z",
            "model2": [
                {
                    "name": "Model2/name/clmma92a",
                    "opt": "Model2/opt/ifdmbolp",
                    "optFloat": 653371.2484914886
                },
                {
                    "name": "Model2/name/sqbf2k6",
                    "opt": "Model2/opt/99ffi5bu",
                    "optFloat": 584053.5212678084
                },
                {
                    "name": "Model2/name/ky5oi5j",
                    "opt": "Model2/opt/b6h8jiz",
                    "optFloat": 103704.77106998143
                }
            ]
        }
              }, res.data.login_v1.token);
        
            expect(response).not.toHaveProperty('errors')
        expect(response).toHaveProperty('data.createModel1.name', 'Model1/name/jrqkvwo')
        expect(response).toHaveProperty('data.createModel1.opt', 'Model1/opt/ym2aq8mt')
        expect(response).toHaveProperty('data.createModel1.optInt', 452820)
        expect(response).toHaveProperty('data.createModel1.optFloat', 714162.0109180656)
        expect(response).toHaveProperty('data.createModel1.arrName', ['Model1/arrName/v1tpmv7','Model1/arrName/7z0pmdic','Model1/arrName/5o0opaht'])
        expect(response).toHaveProperty('data.createModel1.arrInt', [5283575,5906008,976230])
        expect(response).toHaveProperty('data.createModel1.arrFloat', [71985.43736315433,894989.3636426063,294900.862524188])
        expect(response).toHaveProperty('data.createModel1.optDateTime', '2021-05-22T22:12:41.424Z')
        expect(response).toHaveProperty('data.createModel1.model2.0.name', 'Model2/name/clmma92a')
        expect(response).toHaveProperty('data.createModel1.model2.0.opt', 'Model2/opt/ifdmbolp')
        expect(response).toHaveProperty('data.createModel1.model2.0.optFloat', 653371.2484914886)
        expect(response).toHaveProperty('data.createModel1.model2.1.name', 'Model2/name/sqbf2k6')
        expect(response).toHaveProperty('data.createModel1.model2.1.opt', 'Model2/opt/99ffi5bu')
        expect(response).toHaveProperty('data.createModel1.model2.1.optFloat', 584053.5212678084)
        expect(response).toHaveProperty('data.createModel1.model2.2.name', 'Model2/name/ky5oi5j')
        expect(response).toHaveProperty('data.createModel1.model2.2.opt', 'Model2/opt/b6h8jiz')
        expect(response).toHaveProperty('data.createModel1.model2.2.optFloat', 103704.77106998143)
        expect(response).toHaveProperty('data.createModel1.model2.0.model1.id', response.data.createModel1.id)
        expect(response).toHaveProperty('data.createModel1.model2.1.model1.id', response.data.createModel1.id)
        expect(response).toHaveProperty('data.createModel1.model2.2.model1.id', response.data.createModel1.id)
        expect(response).toHaveProperty('data.createModel1.model2.0.id')
        expect(response).toHaveProperty('data.createModel1.model2.1.id')
        expect(response).toHaveProperty('data.createModel1.model2.2.id')
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




