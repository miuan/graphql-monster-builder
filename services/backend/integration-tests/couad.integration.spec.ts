import * as request from 'supertest'
import { disconnectFromServer, generateAndRunServerFromSchema, loadGraphQL } from './utils'
export async function createModel1(server, token){
    const modelModel2 = server.entry.models['model2']

    const modelModel2Data = await Promise.all([
        modelModel2.create({
            "name": "Model2/name/uebiel5",
            "opt": "Model2/opt/uns68j5q",
            "optFloat": 988804.5232840485,
            "model1": "607bc7944481571f509470a2",
            "id": "Model2/id/asjalsg"
}),
        modelModel2.create({
            "name": "Model2/name/fyozcr4l",
            "opt": "Model2/opt/2wg9try",
            "optFloat": 323716.7666569545,
            "model1": "607bc7944481571f509470a2",
            "id": "Model2/id/w5mvb0yc"
}),
        modelModel2.create({
            "name": "Model2/name/0n4111np",
            "opt": "Model2/opt/g6fh7s7",
            "optFloat": 353820.96365906834,
            "model1": "607bc7944481571f509470a2",
            "id": "Model2/id/ezun7if"
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
"name": "Model1/name/a05bsjl",
"opt": "Model1/opt/ihceo0zn",
"optInt": 604673,
"optFloat": 168679.8122456963,
"arrName": [
    "Model1/arrName/83hr7bh",
    "Model1/arrName/0vfe6y5x",
    "Model1/arrName/sd9ooan"
],
"arrInt": [
    450872,
    935105,
    819113
],
"arrFloat": [
    415609.7568177239,
    430780.629430916,
    44720.895268391294
],
"optDateTime": "2020-12-23T23:05:30.691Z",
"model2": [
    {
        "name": "Model2/name/918odrm1",
        "opt": "Model2/opt/ne9g1o8",
        "optFloat": 666221.2651161294
    },
    {
        "name": "Model2/name/hxklg2ae",
        "opt": "Model2/opt/9ms7xvn",
        "optFloat": 531540.3591485334
    },
    {
        "name": "Model2/name/4fe4vtc",
        "opt": "Model2/opt/4380f02l",
        "optFloat": 41788.33097842949
    }
],
"model2Ids": [
    modelModel2Data[0].id,
    modelModel2Data[1].id,
    modelModel2Data[2].id
]
}
  }, token);


    return createModel1Response
}

describe('couad integration', ()=>{
        let server;
        let res

        beforeAll(async ()=>{
            server = await generateAndRunServerFromSchema('couad', `
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
            `, 3002)

            const loginQL = loadGraphQL('./services/backend/integration-tests/graphql/login/login.gql')
            
            res = await server.mutate({
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
            
        })

        afterAll(async () => {
            await disconnectFromServer(server)
           });

           it('create Model1', async()=>{
            const token = res.data.login_v1.token
            
            

            const modelModel2 = server.entry.models['model2']

        const modelModel2Data = await Promise.all([
            modelModel2.create({
				"name": "Model2/name/ro62fot",
				"opt": "Model2/opt/iox3uq54",
				"optFloat": 301064.4681170487,
				"model1": "607bc7944481571f509470a2",
				"id": "Model2/id/adlws4v3"
}),
            modelModel2.create({
				"name": "Model2/name/0tmtk7o8",
				"opt": "Model2/opt/wbap1d0a",
				"optFloat": 984941.7719318485,
				"model1": "607bc7944481571f509470a2",
				"id": "Model2/id/x02w41wn"
}),
            modelModel2.create({
				"name": "Model2/name/2pyhphab",
				"opt": "Model2/opt/zezduro",
				"optFloat": 845804.2934027282,
				"model1": "607bc7944481571f509470a2",
				"id": "Model2/id/ukzswjl9"
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
	"name": "Model1/name/xie76tc",
	"opt": "Model1/opt/allzauub",
	"optInt": 521167,
	"optFloat": 617953.2791989135,
	"arrName": [
		"Model1/arrName/e9a6l28",
		"Model1/arrName/3ux94bkk",
		"Model1/arrName/p3po6mke"
	],
	"arrInt": [
		950283,
		522416,
		826893
	],
	"arrFloat": [
		570636.4829223385,
		507513.37424710894,
		37220.60960374929
	],
	"optDateTime": "2021-01-03T23:46:55.883Z",
	"model2": [
		{
			"name": "Model2/name/3skrz0d6",
			"opt": "Model2/opt/nhh0um6f",
			"optFloat": 92481.98354074644
		},
		{
			"name": "Model2/name/bltylm9p",
			"opt": "Model2/opt/wf32gwp",
			"optFloat": 794966.9055869699
		},
		{
			"name": "Model2/name/li830nr",
			"opt": "Model2/opt/5prbdike",
			"optFloat": 192082.14624164376
		}
	],
	"model2Ids": [
		modelModel2Data[0].id,
		modelModel2Data[1].id,
		modelModel2Data[2].id
	]
}
      }, token);
    expect(createModel1Response).not.toHaveProperty('errors')
expect(createModel1Response).toHaveProperty('data.createModel1.name', 'Model1/name/xie76tc')
expect(createModel1Response).toHaveProperty('data.createModel1.opt', 'Model1/opt/allzauub')
expect(createModel1Response).toHaveProperty('data.createModel1.optInt', 521167)
expect(createModel1Response).toHaveProperty('data.createModel1.optFloat', 617953.2791989135)
expect(createModel1Response).toHaveProperty('data.createModel1.arrName', ['Model1/arrName/e9a6l28','Model1/arrName/3ux94bkk','Model1/arrName/p3po6mke'])
expect(createModel1Response).toHaveProperty('data.createModel1.arrInt', [950283,522416,826893])
expect(createModel1Response).toHaveProperty('data.createModel1.arrFloat', [570636.4829223385,507513.37424710894,37220.60960374929])
expect(createModel1Response).toHaveProperty('data.createModel1.optDateTime', '2021-01-03T23:46:55.883Z')
expect(createModel1Response.data.createModel1.model2).toEqual(expect.arrayContaining([
	expect.objectContaining({name: 'Model2/name/3skrz0d6',opt: 'Model2/opt/nhh0um6f',optFloat: 92481.98354074644,model1:expect.objectContaining({id:createModel1Response.data.createModel1.id})}),
	expect.objectContaining({name: 'Model2/name/bltylm9p',opt: 'Model2/opt/wf32gwp',optFloat: 794966.9055869699,model1:expect.objectContaining({id:createModel1Response.data.createModel1.id})}),
	expect.objectContaining({name: 'Model2/name/li830nr',opt: 'Model2/opt/5prbdike',optFloat: 192082.14624164376,model1:expect.objectContaining({id:createModel1Response.data.createModel1.id})})]))
expect(createModel1Response.data.createModel1.model2).toEqual(expect.arrayContaining([
	expect.objectContaining({id: modelModel2Data[0].id,model1:expect.objectContaining({id:createModel1Response.data.createModel1.id})}),
	expect.objectContaining({id: modelModel2Data[1].id,model1:expect.objectContaining({id:createModel1Response.data.createModel1.id})}),
	expect.objectContaining({id: modelModel2Data[2].id,model1:expect.objectContaining({id:createModel1Response.data.createModel1.id})})]))
expect(createModel1Response).toHaveProperty('data.createModel1.model2.0.id')
expect(createModel1Response).toHaveProperty('data.createModel1.model2.1.id')
expect(createModel1Response).toHaveProperty('data.createModel1.model2.2.id')
expect(createModel1Response).toHaveProperty('data.createModel1.id')
        })
    
    
    
    
        
        it('one Model1', async()=>{
            const token = res.data.login_v1.token
            
            const createModel1Response = await createModel1(server, token)

            const oneModel1Query = `query Model1($id: ID!){
        Model1(id: $id) {
            name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,model2{name,opt,optFloat,model1{id},id},id
        }
    }`
    
    const oneModel1Response = await server.query({
        query: oneModel1Query,
        variables: { id: createModel1Response.data.createModel1.id}
      }, token);

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
	expect.objectContaining({id: createModel1Response.data.createModel1.model2[2].id,model1:expect.objectContaining({id:oneModel1Response.data.Model1.id})}),
	expect.objectContaining({id: createModel1Response.data.createModel1.model2[3].id,model1:expect.objectContaining({id:oneModel1Response.data.Model1.id})}),
	expect.objectContaining({id: createModel1Response.data.createModel1.model2[4].id,model1:expect.objectContaining({id:oneModel1Response.data.Model1.id})}),
	expect.objectContaining({id: createModel1Response.data.createModel1.model2[5].id,model1:expect.objectContaining({id:oneModel1Response.data.Model1.id})})]))
expect(oneModel1Response).toHaveProperty('data.Model1.model2.0.id')
expect(oneModel1Response).toHaveProperty('data.Model1.model2.1.id')
expect(oneModel1Response).toHaveProperty('data.Model1.model2.2.id')
expect(oneModel1Response).toHaveProperty('data.Model1.id', createModel1Response.data.createModel1.id)

    
        })
    
    
    
    
        
        it('update Model1', async()=>{
            const token = res.data.login_v1.token
            
            const createModel1Response = await createModel1(server, token)

            const modelModel2 = server.entry.models['model2']

        const modelModel2Data = await Promise.all([
            modelModel2.create({
				"name": "Model2/name/cjzjoah",
				"opt": "Model2/opt/635x9e6s",
				"optFloat": 388251.8236677499,
				"model1": "607bc7944481571f509470a2",
				"id": "Model2/id/7qej5hrs"
}),
            modelModel2.create({
				"name": "Model2/name/13gzemlu",
				"opt": "Model2/opt/x4f8xymp",
				"optFloat": 809487.9571306355,
				"model1": "607bc7944481571f509470a2",
				"id": "Model2/id/39kmxv3g"
}),
            modelModel2.create({
				"name": "Model2/name/6sf490u",
				"opt": "Model2/opt/w04uxz2",
				"optFloat": 886512.4206799038,
				"model1": "607bc7944481571f509470a2",
				"id": "Model2/id/k4iv0sk"
})
        ])

    const updateModel1Mutation = `mutation UpdateModel1($name: String!,$opt: String,$optInt: Int,$optFloat: Float,$arrName: [String],$arrInt: [Int],$arrFloat: [Float],$optDateTime: DateTime,$model2: [InModel1MemberModel2AsModel2!],$model2Ids: [ID!],$id: ID!){
        updateModel1(name: $name,opt: $opt,optInt: $optInt,optFloat: $optFloat,arrName: $arrName,arrInt: $arrInt,arrFloat: $arrFloat,optDateTime: $optDateTime,model2: $model2, model2Ids: $model2Ids,id: $id) {
           name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,model2{name,opt,optFloat,model1{id},id},id
        }
    }`
    
    const updateModel1Response = await server.mutate({
        mutation: updateModel1Mutation,
        variables: {
	"name": "Model1/name/gexkgkcx",
	"opt": "Model1/opt/zf9atpbr",
	"optInt": 728321,
	"optFloat": 920930.8187684952,
	"arrName": [
		"Model1/arrName/g1v9iyfj",
		"Model1/arrName/mqdmrwt",
		"Model1/arrName/24prqwe7"
	],
	"arrInt": [
		418523,
		619379,
		273255
	],
	"arrFloat": [
		352348.98388495675,
		312806.04741825635,
		89106.33479567754
	],
	"optDateTime": "2020-08-26T22:51:36.298Z",
	"model2": [
		{
			"name": "Model2/name/2zhnzsjg",
			"opt": "Model2/opt/9qg8lvb",
			"optFloat": 608418.0837124346
		},
		{
			"name": "Model2/name/eb6kzl2",
			"opt": "Model2/opt/vi357igc",
			"optFloat": 785493.7033338258
		},
		{
			"name": "Model2/name/d5sgxinr",
			"opt": "Model2/opt/5cavp5g",
			"optFloat": 955555.2557857112
		}
	],
	"model2Ids": [
		modelModel2Data[0].id,
		modelModel2Data[1].id,
		modelModel2Data[2].id
	],
	"id": createModel1Response.data.createModel1.id
}
      }, token);

    expect(updateModel1Response).not.toHaveProperty('errors')
expect(updateModel1Response).toHaveProperty('data.updateModel1.name', 'Model1/name/gexkgkcx')
expect(updateModel1Response).toHaveProperty('data.updateModel1.opt', 'Model1/opt/zf9atpbr')
expect(updateModel1Response).toHaveProperty('data.updateModel1.optInt', 728321)
expect(updateModel1Response).toHaveProperty('data.updateModel1.optFloat', 920930.8187684952)
expect(updateModel1Response).toHaveProperty('data.updateModel1.arrName', ['Model1/arrName/g1v9iyfj','Model1/arrName/mqdmrwt','Model1/arrName/24prqwe7'])
expect(updateModel1Response).toHaveProperty('data.updateModel1.arrInt', [418523,619379,273255])
expect(updateModel1Response).toHaveProperty('data.updateModel1.arrFloat', [352348.98388495675,312806.04741825635,89106.33479567754])
expect(updateModel1Response).toHaveProperty('data.updateModel1.optDateTime', '2020-08-26T22:51:36.298Z')
expect(updateModel1Response.data.updateModel1.model2).toEqual(expect.arrayContaining([
	expect.objectContaining({name: 'Model2/name/2zhnzsjg',opt: 'Model2/opt/9qg8lvb',optFloat: 608418.0837124346,model1:expect.objectContaining({id:updateModel1Response.data.updateModel1.id})}),
	expect.objectContaining({name: 'Model2/name/eb6kzl2',opt: 'Model2/opt/vi357igc',optFloat: 785493.7033338258,model1:expect.objectContaining({id:updateModel1Response.data.updateModel1.id})}),
	expect.objectContaining({name: 'Model2/name/d5sgxinr',opt: 'Model2/opt/5cavp5g',optFloat: 955555.2557857112,model1:expect.objectContaining({id:updateModel1Response.data.updateModel1.id})})]))
expect(updateModel1Response.data.updateModel1.model2).toEqual(expect.arrayContaining([
	expect.objectContaining({id: modelModel2Data[0].id,model1:expect.objectContaining({id:updateModel1Response.data.updateModel1.id})}),
	expect.objectContaining({id: modelModel2Data[1].id,model1:expect.objectContaining({id:updateModel1Response.data.updateModel1.id})}),
	expect.objectContaining({id: modelModel2Data[2].id,model1:expect.objectContaining({id:updateModel1Response.data.updateModel1.id})})]))
expect(updateModel1Response).toHaveProperty('data.updateModel1.model2.0.id')
expect(updateModel1Response).toHaveProperty('data.updateModel1.model2.1.id')
expect(updateModel1Response).toHaveProperty('data.updateModel1.model2.2.id')
expect(updateModel1Response).toHaveProperty('data.updateModel1.id', createModel1Response.data.createModel1.id)
    
        })

        it('all Model1', async()=>{
            const token = res.data.login_v1.token
            
            const createModel1Response = await createModel1(server, token)
const createModel1Response2 = await createModel1(server, token)

            const allModel1Query = `query allModel1 {
        allModel1 {
            name,opt,optInt,optFloat,arrName,arrInt,arrFloat,optDateTime,model2{name,opt,optFloat,model1{id},id},id
        }
    }`
    
    const allModel1Response = await server.query({
        query: allModel1Query,
        variables: { id: createModel1Response.data.createModel1.id}
      }, token);

    
      expect(allModel1Response.data.allModel1).toEqual(expect.arrayContaining([
        expect.objectContaining({name: createModel1Response.data.createModel1.name,opt: createModel1Response.data.createModel1.opt,optInt: createModel1Response.data.createModel1.optInt,optFloat: createModel1Response.data.createModel1.optFloat,arrName: createModel1Response.data.createModel1.arrName,arrInt: createModel1Response.data.createModel1.arrInt,arrFloat: createModel1Response.data.createModel1.arrFloat,optDateTime: createModel1Response.data.createModel1.optDateTime,model2: expect.arrayContaining([
expect.objectContaining({id: createModel1Response.data.createModel1.model2[0].id}),
expect.objectContaining({id: createModel1Response.data.createModel1.model2[1].id}),
expect.objectContaining({id: createModel1Response.data.createModel1.model2[2].id}),
expect.objectContaining({id: createModel1Response.data.createModel1.model2[3].id}),
expect.objectContaining({id: createModel1Response.data.createModel1.model2[4].id}),
expect.objectContaining({id: createModel1Response.data.createModel1.model2[5].id})]),id: createModel1Response.data.createModel1.id})
    ]))
    
    
        })

    })