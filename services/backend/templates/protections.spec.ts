import { filterGen, generateProtections } from './extras'

it('preserves nested AND/OR filters, field comparisons and falsy values', () => {
    expect(filterGen({ AND: [{ name_contains: 'test' }, { OR: [{ id: 'record-id' }, { done: false }] }, { score_gte: 0 }] })).toEqual({
        $and: [{ name: { $regex: 'test', $options: 'i' } }, { $or: [{ _id: 'record-id' }, { done: false }] }, { score: { $gte: 0 } }],
    })
})

it('requires a user for authenticated operations', () => {
    const protections = generateProtections({ models: { userRole: {} } }, 'main')
    expect(protections.user({ state: { user: { id: 'actor-id' } } })).toBe(true)
    expect(protections.user({})).toBeFalsy()
})

describe('owner protection', () => {
    it.each([
        ['actor-id', false, true],
        ['someone-else', false, false],
        ['someone-else', true, true],
    ])('checks owner=%s admin=%s', async (owner, admin, expected) => {
        const findById = jest.fn(() => ({ lean: async () => ({ user: owner }) }))
        const exists = jest.fn().mockResolvedValue(admin)
        const protections = generateProtections({ models: { main: { findById }, userRole: { exists } } }, 'main')
        expect(await protections.owner({ state: { user: { id: 'actor-id' } } }, { id: 'record-id' })).toBe(expected)
        expect(findById).toHaveBeenCalledWith('record-id', 'user')
        if (owner !== 'actor-id') expect(exists).toHaveBeenCalledWith({ name: 'admin', users: 'actor-id' })
        else expect(exists).not.toHaveBeenCalled()
    })

    it('rejects anonymous requests without touching the database', async () => {
        const findById = jest.fn()
        const protections = generateProtections({ models: { main: { findById }, userRole: {} } }, 'main')
        expect(await protections.owner({}, { id: 'record-id' })).toBe(false)
        expect(findById).not.toHaveBeenCalled()
    })
})

it('checks the requested role against the authenticated user', async () => {
    const exists = jest.fn().mockResolvedValue(true)
    const protections = generateProtections({ models: { userRole: { exists } } }, 'main')
    expect(await protections.role({ state: { user: { id: 'actor-id' } } }, ['editor'])).toBe(true)
    expect(exists).toHaveBeenCalledWith({ name: 'editor', users: 'actor-id' })
    exists.mockClear()
    expect(await protections.role({}, ['editor'])).toBeFalsy()
    expect(exists).not.toHaveBeenCalled()
})
