import { SchemaModelRelationType } from '../../common/types'
import { createServiceWithRelation } from '../integration-tests/utils'
describe.skip('service otoreq', () => {
    describe('relations', () => {
        describe('required ONE_TO_ONE', () => {
            let serviceWithRelation
            beforeAll(() => {
                serviceWithRelation = createServiceWithRelation(false, true, 'required')
            })

            beforeEach(() => {
                serviceWithRelation.mockClearToAll()
            })

            it('create ids relation', async () => {
                serviceWithRelation.service.model.create.mockResolvedValue({ id: 'resolved-create-id-1' })
                await serviceWithRelation.createFn({ toThemId: 'them-id-1' })
                expect(serviceWithRelation.service.model.create).toBeCalledTimes(1)
                expect(serviceWithRelation.service.model.create).toBeCalledWith({ toThem: 'them-id-1' })
                expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toBeCalledTimes(1)
                expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(1, { _id: { $in: ['them-id-1'] } }, { backToMe: 'resolved-create-id-1' })
            })

            it('create object relation', async () => {
                serviceWithRelation.service.model.create.mockResolvedValue({ id: 'resolved-create-id-1' })
                serviceWithRelation.entry.services.modelWithOthers.create.mockResolvedValueOnce({ id: 'resolved-relation-create-id-1' })
                await serviceWithRelation.createFn({ toThem: { name: 'name1' } })
                expect(serviceWithRelation.service.model.create).toBeCalledTimes(1)
                expect(serviceWithRelation.service.model.create).toBeCalledWith({ toThem: 'resolved-relation-create-id-1' })

                expect(serviceWithRelation.entry.services.modelWithOthers.create).toBeCalledTimes(1)
                expect(serviceWithRelation.entry.services.modelWithOthers.create).toHaveBeenNthCalledWith(1, { backToMe: 'random-id', name: 'name1' })
                expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toBeCalledTimes(1)

                expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(
                    1,
                    { _id: { $in: ['resolved-relation-create-id-1'] } },
                    { backToMe: 'resolved-create-id-1' },
                )
            })

            it('update ids relation', async () => {
                serviceWithRelation.service.model.findByIdAndUpdate.mockResolvedValue({ id: 'resolved-findByIdAndUpdate-id-1' })
                serviceWithRelation.entry.models.modelWithOthers.findOne.mockResolvedValue({ _id: 'resolved-findOne-id-1' })
                await serviceWithRelation.updateFn({ toThemId: 'them-id-1' }, 'me-id-1')
                expect(serviceWithRelation.service.model.findByIdAndUpdate).toBeCalledTimes(1)
                expect(serviceWithRelation.service.model.findByIdAndUpdate).toBeCalledWith('me-id-1', { toThem: 'them-id-1' }, { new: true })

                expect(serviceWithRelation.entry.models.modelWithOthers.findOne).toBeCalled()
                expect(serviceWithRelation.entry.models.modelWithOthers.findOne).toBeCalledWith({ backToMe: 'me-id-1' }, { _id: true })
                expect(serviceWithRelation.entry.services.modelWithOthers.remove).toBeCalled()
                expect(serviceWithRelation.entry.services.modelWithOthers.remove).toBeCalledWith('resolved-findOne-id-1', null, ['relationOneToOneRequired'])

                expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toBeCalledTimes(1)
                expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toHaveBeenNthCalledWith(1, { _id: { $in: ['them-id-1'] } }, { backToMe: 'resolved-findByIdAndUpdate-id-1' })
            })

            it('update object relation', async () => {
                serviceWithRelation.service.model.findByIdAndUpdate.mockResolvedValue({ id: 'resolved-findByIdAndUpdate-id-1' })
                serviceWithRelation.entry.services.modelWithOthers.create.mockResolvedValueOnce({ id: 'resolved-create-id-1' })
                serviceWithRelation.entry.models.modelWithOthers.findOne.mockResolvedValue({ _id: 'resolved-findOne-id-1' })

                await serviceWithRelation.updateFn({ toThem: { name: 'name1' } }, 'me-id-1')
                expect(serviceWithRelation.service.model.findByIdAndUpdate).toBeCalledTimes(1)
                expect(serviceWithRelation.service.model.findByIdAndUpdate).toBeCalledWith('me-id-1', { toThem: 'resolved-create-id-1' }, { new: true })
                expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).toBeCalledTimes(0)

                expect(serviceWithRelation.entry.models.modelWithOthers.findOne).toBeCalled()
                expect(serviceWithRelation.entry.models.modelWithOthers.findOne).toBeCalledWith({ backToMe: 'me-id-1' }, { _id: true })
                expect(serviceWithRelation.entry.services.modelWithOthers.remove).toBeCalled()
                expect(serviceWithRelation.entry.services.modelWithOthers.remove).toBeCalledWith('resolved-findOne-id-1', null, ['relationOneToOneRequired'])
            })

            it('delete', async () => {
                await serviceWithRelation.removeFn('id-of-removing-1', null, ['123'])
                expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).not.toBeCalled()
                expect(serviceWithRelation.service.model.findByIdAndRemove).toBeCalled()
                expect(serviceWithRelation.entry.services.modelWithOthers.remove).toBeCalled()
                expect(serviceWithRelation.entry.services.modelWithOthers.remove).toBeCalledWith('resolved-findOne-id-1', null, ['123', 'relationOneToOneRequired'])
            })

            it('delete with skip relation', async () => {
                await serviceWithRelation.removeFn('id-of-removing-1', null, ['modelWithOthers'])
                expect(serviceWithRelation.entry.models.modelWithOthers.updateMany).not.toBeCalled()
                expect(serviceWithRelation.service.model.findByIdAndRemove).toBeCalled()
                expect(serviceWithRelation.entry.services.modelWithOthers.remove).not.toBeCalled()
            })
        })
    })
})
