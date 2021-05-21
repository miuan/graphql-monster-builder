
import 'jest-extended'
import * as fs from 'fs'
import { SchemaModel, SchemaModelProtection, SchemaModelProtectionType } from '../../common/types'
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
        // console.log(ex)
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
                

        })
    })
})
    

})