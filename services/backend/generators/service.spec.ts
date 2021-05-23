
import 'jest-extended'
import * as fs from 'fs'
import { SchemaModel, SchemaModelProtection, SchemaModelProtectionType, SchemaModelRelationType } from '../../common/types'
import * as extras from '../templates/extras'
import * as _ from 'lodash'
import { createService, createServiceWithRelation, prepareDirectories } from './testServiceHelper'

export const TEST_DIR = 'templates/__generated_services_for_test__'
const SERVICE_BACKEND = './services/backend/'
export const testDirFullPath = `${SERVICE_BACKEND}${TEST_DIR}`


describe('service', () => {
    let existsSyncMock
    let writeFileSyncMock

    let testResolverWithPublic
    beforeAll(()=>{
        
        prepareDirectories()
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

    describe('relations', ()=>{
        describe.each([
            [SchemaModelRelationType.MANY_TO_MANY, ''],
            [SchemaModelRelationType.MANY_TO_ONE, ''],
            // 
        ])('%s %s', (meType, required)=>{
            
            let serviceWithRelation
                beforeAll(()=>{
                    serviceWithRelation = createServiceWithRelation(meType, required)
                })

                beforeEach(()=>{
                    serviceWithRelation.mockClearToAll()
                })

                it('create no affect relation', async ()=>{
                    await serviceWithRelation.createFn({})
                    expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).not.toBeCalled()
                })

                it('create ids relation', async ()=>{
                    serviceWithRelation.service.model.create.mockResolvedValue({id: 'resolved-create-id-1'})
                    await serviceWithRelation.createFn({toThemIds:['them-id-1', 'them-id-2']})
                    expect(serviceWithRelation.service.model.create).toBeCalledTimes(1)
                    expect(serviceWithRelation.service.model.create).toBeCalledWith({"toThem": ["them-id-1", "them-id-2"]})
                    expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toBeCalledTimes(1)
                    
                    if(meType == SchemaModelRelationType.MANY_TO_MANY){
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(1, { _id: {$in: ['them-id-1', 'them-id-2']} }, {  $push: {backToMe: { $each: ['resolved-create-id-1']}} })
                    } else {
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(1, { _id: {$in: ['them-id-1', 'them-id-2']} }, {  backToMe: 'resolved-create-id-1'})
                    }
                })

                it('create object relation', async ()=>{
                    serviceWithRelation.service.model.create.mockResolvedValue({id: 'resolved-create-id-1'})
                    serviceWithRelation.entry.services.modelWithOthers.create.mockResolvedValueOnce({id: 'resolved-relation-create-id-1'}).mockResolvedValueOnce({id: 'resolved-relation-create-id-2'})
                    await serviceWithRelation.createFn({toThem:[{name:'name1'}, {name:'name2'}]})
                    expect(serviceWithRelation.service.model.create).toBeCalledTimes(1)
                    expect(serviceWithRelation.service.model.create).toBeCalledWith({"toThem": ["resolved-relation-create-id-1", "resolved-relation-create-id-2"]})
                    
                  
                    expect(serviceWithRelation.entry.services.modelWithOthers.create).toBeCalledTimes(2)

                    if(meType == SchemaModelRelationType.MANY_TO_MANY){
                        expect(serviceWithRelation.entry.services.modelWithOthers.create).toHaveBeenNthCalledWith(1, {"name": "name1"})
                        expect(serviceWithRelation.entry.services.modelWithOthers.create).toHaveBeenNthCalledWith(2, {"name": "name2"})
                    } else {
                        expect(serviceWithRelation.entry.services.modelWithOthers.create).toHaveBeenNthCalledWith(1, {"name": "name1"})
                        expect(serviceWithRelation.entry.services.modelWithOthers.create).toHaveBeenNthCalledWith(2, {"name": "name2"})
                    }
                    
                    expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toBeCalledTimes(1)

                    if(meType == SchemaModelRelationType.MANY_TO_MANY){
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(1, { _id: {$in: ['resolved-relation-create-id-1', 'resolved-relation-create-id-2']} }, {  $push: {backToMe: { $each: ['resolved-create-id-1']}} })
                    } else {
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(1, { _id: {$in: ['resolved-relation-create-id-1', 'resolved-relation-create-id-2']} }, {  backToMe: 'resolved-create-id-1'})
                    }

                })

                it('update no affect relation', async ()=>{
                    await serviceWithRelation.updateFn({})
                    expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).not.toBeCalled()
                })

                it('update ids relation', async ()=>{
                    serviceWithRelation.service.model.findByIdAndUpdate.mockResolvedValue({id: 'resolved-findByIdAndUpdate-id-1'})
                    await serviceWithRelation.updateFn({toThemIds:['them-id-1', 'them-id-2']}, 'me-id-1')
                    expect(serviceWithRelation.service.model.findByIdAndUpdate).toBeCalledTimes(1)
                    expect(serviceWithRelation.service.model.findByIdAndUpdate).toBeCalledWith("me-id-1", {"toThem": ["them-id-1", "them-id-2"]}, {"new": true})
                    expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toBeCalledTimes(2)
                    
                    if(meType == SchemaModelRelationType.MANY_TO_MANY){
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(1, {backToMe: {$all: ['me-id-1']}}, {$pull: {backToMe: 'me-id-1'}})
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(2, { _id: {$in: ['them-id-1', 'them-id-2']} }, {  $push: {backToMe: { $each: ['resolved-findByIdAndUpdate-id-1']}} })
                    } else {
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(1, { backToMe: 'me-id-1'}, {backToMe: null})
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(2, { _id: {$in: ['them-id-1', 'them-id-2']} }, {  backToMe: 'resolved-findByIdAndUpdate-id-1'})
                    }
                    
                })

                it('update object relation', async ()=>{
                    serviceWithRelation.service.model.findByIdAndUpdate.mockResolvedValue({id: 'resolved-findByIdAndUpdate-id-1'})
                    serviceWithRelation.entry.services.modelWithOthers.create.mockResolvedValueOnce({id: 'resolved-create-id-1'}).mockResolvedValueOnce({id: 'resolved-create-id-2'})

                    await serviceWithRelation.updateFn({toThem:[{name:'name1'}, {name:'name2'}]}, 'me-id-1')
                    expect(serviceWithRelation.service.model.findByIdAndUpdate).toBeCalledTimes(1)
                    expect(serviceWithRelation.service.model.findByIdAndUpdate).toBeCalledWith("me-id-1", {"toThem": ["resolved-create-id-1", "resolved-create-id-2"]}, {"new": true})
                    expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toBeCalledTimes(1)
                    
                    if(meType == SchemaModelRelationType.MANY_TO_MANY){
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(1, {backToMe: { $all: ['me-id-1']}}, {$pull: {backToMe: 'me-id-1'}})
                    } else {
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(1, { backToMe: 'me-id-1'}, {backToMe: null})
                    }

                    expect(serviceWithRelation.entry.services.modelWithOthers.create).toBeCalledTimes(2)

                    if(meType == SchemaModelRelationType.MANY_TO_MANY){
                        expect(serviceWithRelation.entry.services.modelWithOthers.create).toHaveBeenNthCalledWith(1, {"backToMe": ["me-id-1"], "name": "name1"})
                        expect(serviceWithRelation.entry.services.modelWithOthers.create).toHaveBeenNthCalledWith(2, {"backToMe": ["me-id-1"], "name": "name2"})
                    } else {
                        expect(serviceWithRelation.entry.services.modelWithOthers.create).toHaveBeenNthCalledWith(1, {"backToMe": "me-id-1", "name": "name1"})
                        expect(serviceWithRelation.entry.services.modelWithOthers.create).toHaveBeenNthCalledWith(2, {"backToMe": "me-id-1", "name": "name2"})
                    }
                    
                })

               
                
            })

            


        describe.each([
            [SchemaModelRelationType.ONE_TO_MANY, ''],
            [SchemaModelRelationType.ONE_TO_ONE, ''],
            // [SchemaModelRelationType.ONE_TO_ONE, 'required']
        ])('%s %s', (meType, required)=>{
            
                let serviceWithRelation
                    beforeAll(()=>{
                        serviceWithRelation = createServiceWithRelation(meType, required)
                    })
                    
                    beforeEach(()=>{
                        serviceWithRelation.mockClearToAll()
                    })

                    it('update no affect relation', async ()=>{
                        await serviceWithRelation.updateFn({})
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).not.toBeCalled()
                    })

                    it('update id relation', async ()=>{
                        serviceWithRelation.service.model.findByIdAndUpdate.mockResolvedValue({id: 'resolved-findByIdAndUpdate-id-1'})
                        await serviceWithRelation.updateFn({toThemId:'them-id-1'}, 'me-id-1')
                        expect(serviceWithRelation.service.model.findByIdAndUpdate).toBeCalledTimes(1)
                        expect(serviceWithRelation.service.model.findByIdAndUpdate).toBeCalledWith("me-id-1", {"toThem": "them-id-1"}, {"new": true})
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toBeCalledTimes(2)
                        
                        if(meType == SchemaModelRelationType.ONE_TO_MANY){
                            expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(1, { backToMe: {$all:['me-id-1']}}, {$pull: {backToMe: 'me-id-1'}})
                            expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(2, { _id: {$in: ['them-id-1']} }, {  $push: {backToMe: { $each: ['resolved-findByIdAndUpdate-id-1']}} })
                        } else {
                            expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(1, { backToMe: 'me-id-1'}, {backToMe: null})
                            expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(2, {"_id": {"$in": ["them-id-1"]}}, {"backToMe": "resolved-findByIdAndUpdate-id-1"})
                        }
                        
                    })

                    it('update object relation', async ()=>{
                        serviceWithRelation.service.model.findByIdAndUpdate.mockResolvedValue({id: 'resolved-findByIdAndUpdate-id-1'})
                        serviceWithRelation.entry.services.modelWithOthers.create.mockResolvedValueOnce({id: 'resolved-create-id-1'}).mockResolvedValueOnce({id: 'resolved-create-id-2'})
    
                        await serviceWithRelation.updateFn({toThem:{name:'name1'}}, 'me-id-1')
                        expect(serviceWithRelation.service.model.findByIdAndUpdate).toBeCalledTimes(1)
                        expect(serviceWithRelation.service.model.findByIdAndUpdate).toBeCalledWith("me-id-1", {"toThem": "resolved-create-id-1"}, {"new": true})
                        
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toBeCalledTimes(1)  
                        if(meType == SchemaModelRelationType.ONE_TO_MANY){
                            expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(1, { backToMe: {$all:['me-id-1']}}, {$pull: {backToMe: 'me-id-1'}})
                        } else {
                            expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(1, { backToMe: 'me-id-1'}, {backToMe: null})
                        }

                        expect(serviceWithRelation.entry.services.modelWithOthers.create).toBeCalledTimes(1)
                        if(meType == SchemaModelRelationType.ONE_TO_MANY){
                            expect(serviceWithRelation.entry.services.modelWithOthers.create).toHaveBeenNthCalledWith(1, {"backToMe": ["me-id-1"], "name": "name1"})
                        } else {
                            expect(serviceWithRelation.entry.services.modelWithOthers.create).toHaveBeenNthCalledWith(1, {"backToMe": "me-id-1", "name": "name1"})
                        }
                        
                    })

                    it('delete', async ()=>{
                        await serviceWithRelation.removeFn('id-of-removing-1')
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toBeCalled()
                        expect(serviceWithRelation.service.model.findByIdAndRemove).toBeCalled()
                    })

                    it('delete skip relation to me', async ()=>{
                        await serviceWithRelation.removeFn('id-of-removing-1', null, ['modelWithOthers'])
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).not.toBeCalled()
                        expect(serviceWithRelation.service.model.findByIdAndRemove).toBeCalled()
                    })
                })

                
            })

        })

