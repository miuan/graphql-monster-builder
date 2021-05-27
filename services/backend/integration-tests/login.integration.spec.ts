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

            const modelModel2 = server.entry.models['model2']

        const modelModel2Data = await Promise.all([
            modelModel2.create({
				"name": "Model2/name/v4319nzi",
				"opt": "Model2/opt/pfj2q4lm",
				"optFloat": 886542.9743051663,
				"model1": "607bc7944481571f509470a2"
}),
            modelModel2.create({
				"name": "Model2/name/pkb8wgo8",
				"opt": "Model2/opt/8w76kodx",
				"optFloat": 756007.503293699,
				"model1": "607bc7944481571f509470a2"
}),
            modelModel2.create({
				"name": "Model2/name/v3nf42nn",
				"opt": "Model2/opt/zqq4ftw3",
				"optFloat": 517728.7261187864,
				"model1": "607bc7944481571f509470a2"
})
        ])
            
        const mutation = `mutation CreateModel1($name: String!,$opt: String,$optInt: Int,$optFloat: Float,$arrName: [String],$arrInt: [Int],$arrFloat: [Float],$optDateTime: DateTime,$model2: [InModel1MemberModel2AsModel2!],$model2Ids: [ID!]){
            createModel1(name: $name,opt: $opt,optInt: $optInt,optFloat: $optFloat,arrName: $arrName,arrInt: $arrInt,arrFloat: $arrFloat,optDateTime: $optDateTime,model2: $model2, model2Ids: $model2Ids) {
               name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,model2{name,opt,optFloat,model1{id},id},id
            }
        }`
        
        const response = await server.mutate({
            mutation,
            variables: {
        "name": "Model1/name/37ob06bs",
        "opt": "Model1/opt/54kt8x3",
        "optInt": 52426,
        "optFloat": 803894.1767597477,
        "arrName": [
            "Model1/arrName/v7u6c5x",
            "Model1/arrName/cvxclq59",
            "Model1/arrName/wi3dxb0p"
        ],
        "arrInt": [
            178323,
            961012,
            759014
        ],
        "arrFloat": [
            494951.04467335274,
            922622.0030313241,
            308529.36044976034
        ],
        "optDateTime": "2020-05-27T22:00:23.990Z",
        "model2": [
            {
                "name": "Model2/name/qt9ynicd",
                "opt": "Model2/opt/7h4q1bj",
                "optFloat": 715329.6769870432
            },
            {
                "name": "Model2/name/dee7i3f",
                "opt": "Model2/opt/rrd82w99",
                "optFloat": 799453.7108380719
            },
            {
                "name": "Model2/name/d25uxpo",
                "opt": "Model2/opt/1nxcbn",
                "optFloat": 59741.66343142051
            }
        ],
        "model2Ids": [
            modelModel2Data[0].id,
            modelModel2Data[1].id,
            modelModel2Data[2].id
        ]
    }
          }, res.data.login_v1.token);
    
        expect(response).not.toHaveProperty('errors')
    expect(response).toHaveProperty('data.createModel1.name', 'Model1/name/37ob06bs')
    expect(response).toHaveProperty('data.createModel1.opt', 'Model1/opt/54kt8x3')
    expect(response).toHaveProperty('data.createModel1.optInt', 52426)
    expect(response).toHaveProperty('data.createModel1.optFloat', 803894.1767597477)
    expect(response).toHaveProperty('data.createModel1.arrName', ['Model1/arrName/v7u6c5x','Model1/arrName/cvxclq59','Model1/arrName/wi3dxb0p'])
    expect(response).toHaveProperty('data.createModel1.arrInt', [178323,961012,759014])
    expect(response).toHaveProperty('data.createModel1.arrFloat', [494951.04467335274,922622.0030313241,308529.36044976034])
    expect(response).toHaveProperty('data.createModel1.optDateTime', '2020-05-27T22:00:23.990Z')
    expect(response.data.createModel1.model2).toEqual(expect.arrayContaining([
        expect.objectContaining({name: 'Model2/name/qt9ynicd',opt: 'Model2/opt/7h4q1bj',optFloat: 715329.6769870432,model1:expect.objectContaining({id:response.data.createModel1.id})}),
        expect.objectContaining({name: 'Model2/name/dee7i3f',opt: 'Model2/opt/rrd82w99',optFloat: 799453.7108380719,model1:expect.objectContaining({id:response.data.createModel1.id})}),
        expect.objectContaining({name: 'Model2/name/d25uxpo',opt: 'Model2/opt/1nxcbn',optFloat: 59741.66343142051,model1:expect.objectContaining({id:response.data.createModel1.id})})]))
    expect(response.data.createModel1.model2).toEqual(expect.arrayContaining([
            expect.objectContaining({id: modelModel2Data[0].id,model1:expect.objectContaining({id:response.data.createModel1.id})}),
            expect.objectContaining({id: modelModel2Data[1].id,model1:expect.objectContaining({id:response.data.createModel1.id})}),
            expect.objectContaining({id: modelModel2Data[2].id,model1:expect.objectContaining({id:response.data.createModel1.id})})]))
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




