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
                    "name": "Model2/name/pn79fc3g",
                    "opt": "Model2/opt/065fcekg",
                    "optFloat": 984062.5241212795,
                    "model1": "607bc7944481571f509470a2",
                    "id": "Model2/id/rfy7gim"
    }),
                modelModel2.create({
                    "name": "Model2/name/2wok84c9",
                    "opt": "Model2/opt/oa7w4nrd",
                    "optFloat": 236149.58084816017,
                    "model1": "607bc7944481571f509470a2",
                    "id": "Model2/id/y1bz3k0a"
    }),
                modelModel2.create({
                    "name": "Model2/name/e7221s5d",
                    "opt": "Model2/opt/auo8t1wa",
                    "optFloat": 43987.56298728812,
                    "model1": "607bc7944481571f509470a2",
                    "id": "Model2/id/4ntnlw8"
    })
            ])
    
        const createModel1Mutation = `mutation CreateModel1($name: String!,$opt: String,$optInt: Int,$optFloat: Float,$arrName: [String],$arrInt: [Int],$arrFloat: [Float],$optDateTime: DateTime,$model2: [InModel1MemberModel2AsModel2!],$model2Ids: [ID!]){
            createModel1(name: $name,opt: $opt,optInt: $optInt,optFloat: $optFloat,arrName: $arrName,arrInt: $arrInt,arrFloat: $arrFloat,optDateTime: $optDateTime,model2: $model2, model2Ids: $model2Ids) {
               name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,model2{name,opt,optFloat,model1{id},id},id
            }
        }`
        
        const createModel1Response = await server.mutate({
            mutation: createModel1Mutation,
            variables: {
        "name": "Model1/name/g864fds4",
        "opt": "Model1/opt/h8mh2hvi",
        "optInt": 398661,
        "optFloat": 941035.4038235695,
        "arrName": [
            "Model1/arrName/7gbcv779",
            "Model1/arrName/zvw8w4wo",
            "Model1/arrName/otkz4x6o"
        ],
        "arrInt": [
            589617,
            788864,
            367384
        ],
        "arrFloat": [
            354413.2473262602,
            583756.2763030699,
            175525.17500836527
        ],
        "optDateTime": "2021-02-04T23:21:30.194Z",
        "model2": [
            {
                "name": "Model2/name/cnh5wx2r",
                "opt": "Model2/opt/i09e3t8l",
                "optFloat": 857354.143177198
            },
            {
                "name": "Model2/name/yhlzxwt9",
                "opt": "Model2/opt/ua6hsc95",
                "optFloat": 370633.45412272855
            },
            {
                "name": "Model2/name/k0jppsc",
                "opt": "Model2/opt/iq4yr0g8",
                "optFloat": 764942.5439849258
            }
        ],
        "model2Ids": [
            modelModel2Data[0].id,
            modelModel2Data[1].id,
            modelModel2Data[2].id
        ]
    }
          }, res.data.login_v1.token);
    
        expect(createModel1Response).not.toHaveProperty('errors')
    expect(createModel1Response).toHaveProperty('data.createModel1.name', 'Model1/name/g864fds4')
    expect(createModel1Response).toHaveProperty('data.createModel1.opt', 'Model1/opt/h8mh2hvi')
    expect(createModel1Response).toHaveProperty('data.createModel1.optInt', 398661)
    expect(createModel1Response).toHaveProperty('data.createModel1.optFloat', 941035.4038235695)
    expect(createModel1Response).toHaveProperty('data.createModel1.arrName', ['Model1/arrName/7gbcv779','Model1/arrName/zvw8w4wo','Model1/arrName/otkz4x6o'])
    expect(createModel1Response).toHaveProperty('data.createModel1.arrInt', [589617,788864,367384])
    expect(createModel1Response).toHaveProperty('data.createModel1.arrFloat', [354413.2473262602,583756.2763030699,175525.17500836527])
    expect(createModel1Response).toHaveProperty('data.createModel1.optDateTime', '2021-02-04T23:21:30.194Z')
    expect(createModel1Response.data.createModel1.model2).toEqual(expect.arrayContaining([
        expect.objectContaining({name: 'Model2/name/cnh5wx2r',opt: 'Model2/opt/i09e3t8l',optFloat: 857354.143177198,model1:expect.objectContaining({id:createModel1Response.data.createModel1.id})}),
        expect.objectContaining({name: 'Model2/name/yhlzxwt9',opt: 'Model2/opt/ua6hsc95',optFloat: 370633.45412272855,model1:expect.objectContaining({id:createModel1Response.data.createModel1.id})}),
        expect.objectContaining({name: 'Model2/name/k0jppsc',opt: 'Model2/opt/iq4yr0g8',optFloat: 764942.5439849258,model1:expect.objectContaining({id:createModel1Response.data.createModel1.id})})]))
    expect(createModel1Response.data.createModel1.model2).toEqual(expect.arrayContaining([
        expect.objectContaining({id: modelModel2Data[0].id,model1:expect.objectContaining({id:createModel1Response.data.createModel1.id})}),
        expect.objectContaining({id: modelModel2Data[1].id,model1:expect.objectContaining({id:createModel1Response.data.createModel1.id})}),
        expect.objectContaining({id: modelModel2Data[2].id,model1:expect.objectContaining({id:createModel1Response.data.createModel1.id})})]))
    expect(createModel1Response).toHaveProperty('data.createModel1.model2.0.id')
    expect(createModel1Response).toHaveProperty('data.createModel1.model2.1.id')
    expect(createModel1Response).toHaveProperty('data.createModel1.model2.2.id')
    expect(createModel1Response).toHaveProperty('data.createModel1.id')
        
    
    const oneModel1Query = `query Model1($id: ID!){
        Model1(id: $id) {
            name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,model2{name,opt,optFloat,model1{id},id},id
        }
    }`
    
    const oneModel1Response = await server.query({
        query: oneModel1Query,
        variables: { id: createModel1Response.data.createModel1.id}
      }, res.data.login_v1.token);


      expect(oneModel1Response).not.toHaveProperty('errors')
      expect(oneModel1Response).toHaveProperty('data.Model1.name', createModel1Response.data.createModel1.name)
      expect(oneModel1Response).toHaveProperty('data.Model1.opt', createModel1Response.data.createModel1.opt)
      expect(oneModel1Response).toHaveProperty('data.Model1.optInt', createModel1Response.data.createModel1.optInt)
      expect(oneModel1Response).toHaveProperty('data.Model1.optFloat', createModel1Response.data.createModel1.optFloat)
      expect(oneModel1Response).toHaveProperty('data.Model1.arrName', createModel1Response.data.createModel1.arrName)
      expect(oneModel1Response).toHaveProperty('data.Model1.arrInt', createModel1Response.data.createModel1.arrInt)
      expect(oneModel1Response).toHaveProperty('data.Model1.arrFloat', createModel1Response.data.createModel1.arrFloat)
      expect(oneModel1Response).toHaveProperty('data.Model1.optDateTime', createModel1Response.data.createModel1.optDateTime)
      expect(oneModel1Response.data.Model1.model2).toEqual(expect.arrayContaining([
          expect.objectContaining({id: createModel1Response.data.createModel1.model2[0].id,model1:expect.objectContaining({id:oneModel1Response.data.Model1.id})}),
          expect.objectContaining({id: createModel1Response.data.createModel1.model2[1].id,model1:expect.objectContaining({id:oneModel1Response.data.Model1.id})}),
          expect.objectContaining({id: createModel1Response.data.createModel1.model2[2].id,model1:expect.objectContaining({id:oneModel1Response.data.Model1.id})})]))
      expect(oneModel1Response).toHaveProperty('data.Model1.model2.0.id')
      expect(oneModel1Response).toHaveProperty('data.Model1.model2.1.id')
      expect(oneModel1Response).toHaveProperty('data.Model1.model2.2.id')
      expect(oneModel1Response).toHaveProperty('data.Model1.id', createModel1Response.data.createModel1.id)
      


    
    
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




