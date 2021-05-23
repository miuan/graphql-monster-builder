import { SchemaModelRelationType } from "../../common/types"
import { createServiceWithRelation } from "../integration-tests/utils"
describe('service', () =>{
    describe('relations', () =>{
                
            describe('required MANY_TO_ONE', ()=>{
                
                let serviceWithRelation
                    beforeAll(()=>{
                        serviceWithRelation = createServiceWithRelation(SchemaModelRelationType.MANY_TO_ONE, 'required')
                    })

                    beforeEach(()=>{
                        serviceWithRelation.mockClearToAll()
                    })

                    it('create ids relation', async ()=>{
                        serviceWithRelation.service.model.create.mockResolvedValue({id: 'resolved-create-id-1'})
                        await serviceWithRelation.createFn({toThemIds:['them-id-1', 'them-id-2']})
                        expect(serviceWithRelation.service.model.create).toBeCalledTimes(1)
                        expect(serviceWithRelation.service.model.create).toBeCalledWith({"toThem": ["them-id-1", "them-id-2"]})
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toBeCalledTimes(1)
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(1, { _id: {$in: ['them-id-1', 'them-id-2']} }, {  backToMe: 'resolved-create-id-1'})
                    })

                    it('create object relation', async ()=>{
                        serviceWithRelation.service.model.create.mockResolvedValue({id: 'resolved-create-id-1'})
                        serviceWithRelation.entry.services.modelWithOthers.create.mockResolvedValueOnce({id: 'resolved-relation-create-id-1'}).mockResolvedValueOnce({id: 'resolved-relation-create-id-2'})
                        await serviceWithRelation.createFn({toThem:[{name:'name1'}, {name:'name2'}]})
                        expect(serviceWithRelation.service.model.create).toBeCalledTimes(1)
                        expect(serviceWithRelation.service.model.create).toBeCalledWith({"toThem": ["resolved-relation-create-id-1", "resolved-relation-create-id-2"]})

                        expect(serviceWithRelation.entry.services.modelWithOthers.create).toBeCalledTimes(2)
                        expect(serviceWithRelation.entry.services.modelWithOthers.create).toHaveBeenNthCalledWith(1, {"backToMe": "random-id", "name": "name1"})
                        expect(serviceWithRelation.entry.services.modelWithOthers.create).toHaveBeenNthCalledWith(2, {"backToMe": "random-id", "name": "name2"}) 
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toBeCalledTimes(1)

                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(1, { _id: {$in: ['resolved-relation-create-id-1', 'resolved-relation-create-id-2']} }, {  backToMe: 'resolved-create-id-1'})
                    })

                    it('update ids relation', async ()=>{
                        serviceWithRelation.service.model.findByIdAndUpdate.mockResolvedValue({id: 'resolved-findByIdAndUpdate-id-1'})
                        serviceWithRelation.entry.models.modelWithOthers.findOne.mockResolvedValue({_id: 'resolved-findOne-id-1'})
                        await serviceWithRelation.updateFn({toThemIds:['them-id-1', 'them-id-2']}, 'me-id-1')
                        expect(serviceWithRelation.service.model.findByIdAndUpdate).toBeCalledTimes(1)
                        expect(serviceWithRelation.service.model.findByIdAndUpdate).toBeCalledWith("me-id-1", {"toThem": ["them-id-1", "them-id-2"]}, {"new": true})
                        
                        expect(serviceWithRelation.entry.models.modelWithOthers.findOne).toBeCalled()
                        expect(serviceWithRelation.entry.models.modelWithOthers.findOne).toBeCalledWith({backToMe: 'me-id-1'}, {_id:true})
                        expect(serviceWithRelation.entry.services.modelWithOthers.remove).toBeCalled()
                        expect(serviceWithRelation.entry.services.modelWithOthers.remove).toBeCalledWith("resolved-findOne-id-1", null, ["relationManyToOneRequired"])
                        
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toBeCalledTimes(1)
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(1, { _id: {$in: ['them-id-1', 'them-id-2']} }, {  backToMe: 'resolved-findByIdAndUpdate-id-1'})

                    })

                    it('update object relation', async ()=>{
                        serviceWithRelation.service.model.findByIdAndUpdate.mockResolvedValue({id: 'resolved-findByIdAndUpdate-id-1'})
                        serviceWithRelation.entry.services.modelWithOthers.create.mockResolvedValueOnce({id: 'resolved-create-id-1'}).mockResolvedValueOnce({id: 'resolved-create-id-2'})
    
                        await serviceWithRelation.updateFn({toThem:[{name:'name1'}, {name:'name2'}]}, 'me-id-1')
                        expect(serviceWithRelation.service.model.findByIdAndUpdate).toBeCalledTimes(1)
                        expect(serviceWithRelation.service.model.findByIdAndUpdate).toBeCalledWith("me-id-1", {"toThem": ["resolved-create-id-1", "resolved-create-id-2"]}, {"new": true})
                        expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toBeCalledTimes(0)
                        
                        expect(serviceWithRelation.entry.models.modelWithOthers.findOne).toBeCalled()
                        expect(serviceWithRelation.entry.models.modelWithOthers.findOne).toBeCalledWith({backToMe: 'me-id-1'}, {_id:true})
                        expect(serviceWithRelation.entry.services.modelWithOthers.remove).toBeCalled()
                        expect(serviceWithRelation.entry.services.modelWithOthers.remove).toBeCalledWith("resolved-findOne-id-1", null, ["relationManyToOneRequired"])
                    })
           
        })
    })
})