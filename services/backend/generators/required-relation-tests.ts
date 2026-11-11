import { createRelationFixture } from './generator-fixtures'

export const testRequiredRelation = (many: boolean) => {
    let fixture: ReturnType<typeof createRelationFixture>
    beforeEach(() => {
        fixture = createRelationFixture(many, false, true)
    })
    afterEach(() => {
        fixture.dispose()
    })

    it('passes the temporary parent ID when creating a required nested child', async () => {
        fixture.model.create.mockResolvedValue({ id: 'parent-id' })
        fixture.relatedService.create.mockResolvedValue({ id: 'related-id' })
        await fixture.service.create({ related: many ? [{ name: 'nested' }] : { name: 'nested' } })
        expect(fixture.relatedService.create).toHaveBeenCalledWith({ name: 'nested', mainId: fixture.temporaryId })
        expect(fixture.related.updateMany).toHaveBeenCalledWith({ _id: { $in: ['related-id'] } }, { main: 'parent-id' })
    })

    it('deletes required dependents before changing the parent relation', async () => {
        fixture.related.find.mockResolvedValue([{ _id: 'old-related-id' }])
        fixture.model.findByIdAndUpdate.mockResolvedValue({ id: 'parent-id' })
        await fixture.service.update(many ? { relatedIds: ['new-related-id'] } : { relatedId: 'new-related-id' }, 'parent-id', 'actor-id')
        expect(fixture.related.find).toHaveBeenCalledWith({ main: 'parent-id' }, { _id: true })
        expect(fixture.relatedService.remove).toHaveBeenCalledWith('old-related-id', 'actor-id', ['Main'])
        expect(fixture.relatedService.remove.mock.invocationCallOrder[0]).toBeLessThan(fixture.model.findByIdAndUpdate.mock.invocationCallOrder[0])
    })

    it('cascades removal through services and marks the visited parent', async () => {
        fixture.related.find.mockResolvedValue([{ _id: 'related-id' }])
        await fixture.service.remove('parent-id', 'actor-id', ['visited'])
        expect(fixture.relatedService.remove).toHaveBeenCalledWith('related-id', 'actor-id', ['visited', 'Main'])
        expect(fixture.model.findByIdAndDelete).toHaveBeenCalledWith('parent-id')
    })
}
