import { createRelationFixture } from './generator-fixtures'

// Exercise emitted service code using model metadata from the real schema parser.
describe.each([true, false])('generated service, array relation: %s', (many) => {
    describe.each([true, false])('inverse array relation: %s', (inverseMany) => {
        let fixture: ReturnType<typeof createRelationFixture>
        beforeEach(() => {
            fixture = createRelationFixture(many, inverseMany, false)
        })
        afterEach(() => {
            fixture.dispose()
        })

        it('converts supplied IDs and links the inverse relation on creation', async () => {
            fixture.model.create.mockResolvedValue({ id: 'saved-id' })
            const input = many ? { relatedIds: ['related-id'] } : { relatedId: 'related-id' }
            await fixture.service.create(input)
            expect(fixture.model.create).toHaveBeenCalledWith(expect.objectContaining({ related: many ? ['related-id'] : 'related-id' }))
            expect(fixture.related.updateMany).toHaveBeenCalledWith({ _id: { $in: ['related-id'] } }, inverseMany ? { $push: { main: { $each: ['saved-id'] } } } : { main: 'saved-id' })
        })

        it('creates nested related objects before saving the parent', async () => {
            fixture.model.create.mockResolvedValue({ id: 'saved-id' })
            fixture.relatedService.create.mockResolvedValue({ id: 'related-id' })
            await fixture.service.create({ related: many ? [{ name: 'nested' }] : { name: 'nested' } })
            expect(fixture.relatedService.create).toHaveBeenCalledWith({ name: 'nested' })
            expect(fixture.model.create).toHaveBeenCalledWith(expect.objectContaining({ related: many ? ['related-id'] : 'related-id' }))
            expect(fixture.relatedService.create.mock.invocationCallOrder[0]).toBeLessThan(fixture.model.create.mock.invocationCallOrder[0])
        })

        it('disconnects old relationships before updating and validates the update', async () => {
            fixture.model.findByIdAndUpdate.mockResolvedValue({ id: 'saved-id' })
            await fixture.service.update(many ? { relatedIds: ['related-id'] } : { relatedId: 'related-id' }, 'parent-id')
            expect(fixture.related.updateMany).toHaveBeenNthCalledWith(
                1,
                inverseMany ? { main: { $all: ['parent-id'] } } : { main: 'parent-id' },
                inverseMany ? { $pull: { main: 'parent-id' } } : { main: null },
            )
            expect(fixture.model.findByIdAndUpdate).toHaveBeenCalledWith('parent-id', expect.objectContaining({ related: many ? ['related-id'] : 'related-id' }), { new: true, runValidators: true })
            expect(fixture.related.updateMany.mock.invocationCallOrder[0]).toBeLessThan(fixture.model.findByIdAndUpdate.mock.invocationCallOrder[0])
        })

        it('unlinks inverse references when deleting the parent', async () => {
            await fixture.service.remove('parent-id')
            expect(fixture.related.updateMany).toHaveBeenCalledTimes(1)
            expect(fixture.model.findByIdAndDelete).toHaveBeenCalledWith('parent-id')
        })

        it('skips a relation already being removed to prevent recursive deletion', async () => {
            await fixture.service.remove('parent-id', null, ['related'])
            expect(fixture.related.updateMany).not.toHaveBeenCalled()
            expect(fixture.model.findByIdAndDelete).toHaveBeenCalledWith('parent-id')
        })

        it('does not disconnect relations when updating only a scalar', async () => {
            await fixture.service.update({ name: 'changed' }, 'parent-id')
            expect(fixture.related.updateMany).not.toHaveBeenCalled()
        })
    })
})

describe.each(['Create', 'Update', 'Remove'] as const)('generated service %s hooks', (operation) => {
    let fixture: ReturnType<typeof createRelationFixture>
    beforeEach(() => {
        fixture = createRelationFixture(false, false, false)
    })
    afterEach(() => {
        fixture.dispose()
    })

    it('runs hooks around the database operation and keeps the actor ID', async () => {
        const database = fixture.model[operation === 'Create' ? 'create' : operation === 'Update' ? 'findByIdAndUpdate' : 'findByIdAndDelete']
        database.mockResolvedValue({ id: 'parent-id' })
        const before = jest.fn(async (_entry, payload) => ({ ...payload.data, name: 'from-hook' }))
        const after = jest.fn().mockResolvedValue({ id: 'after-hook' })
        fixture.entry.hooks.services['beforeMain' + operation] = before
        fixture.entry.hooks.services['afterMain' + operation] = after
        const result =
            operation === 'Create'
                ? await fixture.service.create({ name: 'original' }, 'actor-id')
                : operation === 'Update'
                  ? await fixture.service.update({ name: 'original' }, 'parent-id', 'actor-id')
                  : await fixture.service.remove('parent-id', 'actor-id')
        expect(before).toHaveBeenCalledWith(fixture.entry, expect.objectContaining({ ctxUserId: 'actor-id' }))
        expect(after).toHaveBeenCalledWith(fixture.entry, expect.objectContaining({ ctxUserId: 'actor-id', data: { id: 'parent-id' } }))
        expect(before.mock.invocationCallOrder[0]).toBeLessThan(database.mock.invocationCallOrder[0])
        expect(after.mock.invocationCallOrder[0]).toBeGreaterThan(database.mock.invocationCallOrder[0])
        if (operation !== 'Remove') expect(database.mock.calls[0][operation === 'Create' ? 0 : 1].name).toBe('from-hook')
        expect(result).toEqual({ id: 'after-hook' })
    })

    it('stops before touching the database if the before hook fails', async () => {
        fixture.entry.hooks.services['beforeMain' + operation] = jest.fn().mockRejectedValue(new Error('hook failed'))
        const result = operation === 'Create' ? fixture.service.create({}) : operation === 'Update' ? fixture.service.update({}, 'parent-id') : fixture.service.remove('parent-id')
        await expect(result).rejects.toThrow('hook failed')
        expect(fixture.model.create).not.toHaveBeenCalled()
        expect(fixture.model.findByIdAndUpdate).not.toHaveBeenCalled()
        expect(fixture.model.findByIdAndDelete).not.toHaveBeenCalled()
    })
})
