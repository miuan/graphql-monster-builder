
import 'jest-extended'
import * as fs from 'fs'
import { SchemaModel, SchemaModelProtection, SchemaModelProtectionType, SchemaModelRelationType } from '../../common/types'
import * as service from './service'
import * as extras from '../templates/extras'
import * as _ from 'lodash'

const TEST_DIR = 'templates/__generated_services_for_test__'
const SERVICE_BACKEND = './services/backend/'
const testDirFullPath = `${SERVICE_BACKEND}${TEST_DIR}`

const createService = (model) => {

    const created = service.createService(model)
    const camelName = _.camelCase(model.modelName)
    fs.writeFileSync(`${testDirFullPath}/services/${camelName}Service.ts`, created)
    fs.writeFileSync(`${testDirFullPath}/models/${camelName}.ts`, `export const ${camelName}Model = {
        create: jest.fn(), //.mockImplementation(async (data)=>data),
        findByIdAndUpdate: jest.fn(), //.mockImplementation(async (id, data)=>data),
        findByIdAndRemove: jest.fn() //.mockImplementation(async (data)=>data),
    } as any;
    export const Types = {ObjectId: jest.fn().mockImplementation(()=>'random-id')}
    export default ${camelName}Model`)

    try{
        const service = require(`../${TEST_DIR}/services/${camelName}Service.ts`)
        const model = require(`../${TEST_DIR}/models/${camelName}.ts`)[`${camelName}Model`]
        return {service, model, mockClearToAll: () => {
            model.create.mockClear()
            model.findByIdAndUpdate.mockClear()
            model.findByIdAndRemove.mockClear()
        }}
    } catch (ex) {
        console.error(ex)
        throw ex
    }
    
}

const createEntryMock = (resolverName:string, method: string) => {
    const lowerMethod = method.toLowerCase()
    const entry = {
        hooks: {},
        services: {} as any
    }
    entry.services[resolverName]={}
    entry.services[resolverName][lowerMethod] = jest.fn().mockResolvedValue(`${lowerMethod}_output`)

    // entry.hooks[`beforetestResolver${method}`] = jest.fn().mockResolvedValue({beforeHookResponse: `${lowerMethod}_output`})
    // entry.hooks[`aftertestResolver${method}`] = jest.fn().mockResolvedValue({afterHookResponse: `${lowerMethod}_output`})

    return entry
}

describe('service', () => {
    let existsSyncMock
    let writeFileSyncMock

    let testResolverWithPublic
    beforeAll(()=>{
        
        if(!fs.existsSync(testDirFullPath)){
            fs.mkdirSync(testDirFullPath)
        } 
        
        if(!fs.existsSync(`${testDirFullPath}/services`)){
            fs.mkdirSync(`${testDirFullPath}/services`)
        } 

        if(!fs.existsSync(`${testDirFullPath}/models`)){
            fs.mkdirSync(`${testDirFullPath}/models`)
        } 

        //if(!fs.existsSync(`${testDirFullPath}/extras.ts`)){
            fs.writeFileSync(`${testDirFullPath}/extras.ts`, `
export const filterGen = jest.fn()
export default filterGen
`)
        //}
        
    })



    afterAll(()=>{
        fs.rmdirSync(testDirFullPath)
    })


    describe('hooks', ()=>{
        let hookService
        beforeAll(()=>{
            hookService = createService({modelName:'Hook', members:[]})

        })

        describe.each([
            'before',
            'after'
        ])('%s ', (method)=>{

            beforeEach(()=>{
                hookService.mockClearToAll()
            })

            it.each([
                ['create', 'create'], 
                ['update', 'findByIdAndUpdate'], 
                ['remove', 'findByIdAndRemove']
            ])('%s', async (forWho, modelMethod)=>{
                const hookName = _.camelCase(`${method} Hook ${forWho}`)
                const methodName = _.camelCase(`hook ${forWho}`)
                const entry = { hooks: {services : {}}}
                entry.hooks.services[hookName] = jest.fn()

                
                
                const methodFn = hookService.service[methodName](entry)

                const aId = 'random-id-value'
                const aObject = {}
                const aResultedObject = {_id:aId}

                hookService.model[modelMethod].mockImplementation(()=>aResultedObject)
                
                if(forWho == 'create') await methodFn(aObject)
                else if(forWho == 'update') await methodFn(aObject, aId)
                else if(forWho == 'remove') await methodFn(aId, aObject)

                expect(entry.hooks.services[hookName]).toBeCalledTimes(1)
                expect(entry.hooks.services[hookName].mock.calls[0][0]).toEqual(entry)

                // hook create doesn't have id
                if(hookName!=='beforeHookCreate') {
                    expect(entry.hooks.services[hookName].mock.calls[0][1]).toHaveProperty('id', aId)
                }

                // hook before remove doesn't have data
                if(hookName!=='beforeHookRemove') {
                    const hookData = method == 'before' ? aObject : aResultedObject
                    expect(entry.hooks.services[hookName].mock.calls[0][1]).toHaveProperty('data', hookData)
                }

                expect(hookService.model[modelMethod]).toBeCalledTimes(1)
                
                if(method == 'after') expect(hookService.model[modelMethod]).toHaveBeenCalledBefore(entry.hooks.services[hookName])
                else expect(hookService.model[modelMethod]).toHaveBeenCalledAfter(entry.hooks.services[hookName])

        })
    })
})

function reverseType(meType){
    if(meType == SchemaModelRelationType.MANY_TO_MANY) return SchemaModelRelationType.MANY_TO_MANY
    if(meType == SchemaModelRelationType.MANY_TO_ONE) return SchemaModelRelationType.ONE_TO_MANY
    if(meType == SchemaModelRelationType.ONE_TO_MANY) return SchemaModelRelationType.MANY_TO_ONE
    else return SchemaModelRelationType.ONE_TO_ONE
}

function createServiceWithRelation(meType, required){
    let relationService
    let modelName = _.camelCase(`Relation ${meType} ${required} `)
    const memberWeWithRelationOthers = {
        name: 'toThem',
        relation: {
            name: 'WeConnectToOthers',
            isRequired: false,
            type: meType,
            relatedModel: {
                modelName: 'ModelWithOthers',
                members: [
                    {
                        name: 'backToMe', 
                        isRequired: required === 'required',
                        relation: {
                            name: 'WeConnectToOthers',
                            type: reverseType(meType)
                        }
                    }
                ]
            }
        }
    }

    const updateMany = jest.fn()
    const findOne = jest.fn()
    const remove = jest.fn()

    const entry = { 
        hooks: {services : {}},
        services: {
            modelWithOthers: {
                remove
            }
        },
        models: {
            modelWithOthers: {
                updateMany,
                findOne

            }
        }
    }
    relationService = createService({modelName, members:[memberWeWithRelationOthers]})
    // relationService.model.findByIdAndUpdate.mockResolvedValue({id: 'resolved-findByIdAndUpdate-id-1'})
    
    const updateGen = relationService.service[`${modelName}Update`]
    expect(updateGen).toBeFunction()

    const updateFn = updateGen(entry)
    expect(updateFn).toBeFunction()

    return {service: relationService, entry, updateFn, updateMany, findOne, remove}
}

    describe('relations', ()=>{
        describe.each([
            [SchemaModelRelationType.MANY_TO_MANY, ''],
            [SchemaModelRelationType.MANY_TO_ONE, 'required'],
            [SchemaModelRelationType.MANY_TO_ONE, ''],
            // 
        ])('%s %s', (meType, required)=>{
            
            let serviceWithRelation
                beforeAll(()=>{
                    serviceWithRelation = createServiceWithRelation(meType, required)
                })

                beforeEach(()=>{
                    serviceWithRelation.updateMany.mockReset()
                    serviceWithRelation.findOne.mockReset()
                    serviceWithRelation.remove.mockReset()
                    serviceWithRelation.service.mockClearToAll()
                })


                it('update no affect relation', async ()=>{
                    await serviceWithRelation.updateFn({})
                    expect(serviceWithRelation.updateMany).not.toBeCalled()
                })

                it('update ids relation', async ()=>{
                    serviceWithRelation.service.model.findByIdAndUpdate.mockResolvedValue({id: 'resolved-findByIdAndUpdate-id-1'})
                    await serviceWithRelation.updateFn({toThemIds:['them-id-1', 'them-id-2']}, 'me-id-1')
                    expect(serviceWithRelation.service.model.findByIdAndUpdate).toBeCalledTimes(1)
                    expect(serviceWithRelation.service.model.findByIdAndUpdate).toBeCalledWith("me-id-1", {"toThem": ["them-id-1", "them-id-2"]}, {"new": true})
                    
                    
                    if(meType == SchemaModelRelationType.MANY_TO_MANY){
                        expect(serviceWithRelation.updateMany).toBeCalledTimes(2)
                        expect(serviceWithRelation.updateMany).toHaveBeenNthCalledWith(1, {}, {$pull: {backToMe: 'me-id-1'}})
                        expect(serviceWithRelation.updateMany).toHaveBeenNthCalledWith(2, { _id: {$in: ['them-id-1', 'them-id-2']} }, {  $push: {backToMe: { $each: ['resolved-findByIdAndUpdate-id-1']}} })
                    } else if(required) {
                        expect(serviceWithRelation.updateMany).toBeCalledTimes(1)
                        expect(serviceWithRelation.updateMany).toHaveBeenNthCalledWith(1, { _id: {$in: ['them-id-1', 'them-id-2']} }, {  backToMe: 'resolved-findByIdAndUpdate-id-1'})
                    } else {
                        expect(serviceWithRelation.updateMany).toBeCalledTimes(2)
                        expect(serviceWithRelation.updateMany).toHaveBeenNthCalledWith(1, { backToMe: 'me-id-1'}, {backToMe: null})
                        expect(serviceWithRelation.updateMany).toHaveBeenNthCalledWith(2, { _id: {$in: ['them-id-1', 'them-id-2']} }, {  backToMe: 'resolved-findByIdAndUpdate-id-1'})
                    }
                    
                })

                // it.each([
                //     ['update1', 'create'], 
                // ])('%s', async (forWho, modelMethod)=>{
                //     // expect(forWho).toEqual('ahoj')
                // })
            })


        describe.each([
            // [SchemaModelRelationType.ONE_TO_MANY, ''],
            // [SchemaModelRelationType.ONE_TO_ONE, ''],
            // [SchemaModelRelationType.ONE_TO_ONE, 'required']
        ])('%s %s', (meType, required)=>{
            
                let serviceWithRelation
                    beforeAll(()=>{
                        serviceWithRelation = createServiceWithRelation(meType, required)
                    })

                    it.each([
                        ['without relation']
                    ])('update %s', async ()=>{
                        

                        await serviceWithRelation.updateFn({toThemIds:['1','2']})


                        expect(true).toEqual(true)
                    })

                    // it.each([
                    //     ['update1', 'create'], 
                    // ])('%s', async (forWho, modelMethod)=>{
                    //     // expect(forWho).toEqual('ahoj')
                    // })
                })

            })

        })