import * as extras from './extras'

const originalSecret = process.env.JWT_TOKEN_SECRET
beforeAll(() => {
    process.env.JWT_TOKEN_SECRET = 'auth-helper-test-secret'
})
afterAll(() => {
    if (originalSecret === undefined) delete process.env.JWT_TOKEN_SECRET
    else process.env.JWT_TOKEN_SECRET = originalSecret
})

const createUserFixture = () => {
    const user = {
        id: 'actor-id',
        roles: [],
        __password: '$2b$04$5FicjiuYszDbF8N6.gxUYuM5v/P/mQcGJIk1XeOmehsC8CwjQNfcO',
        save: jest.fn().mockResolvedValue(undefined),
    }
    const userModel = { findOne: jest.fn().mockResolvedValue(user), findById: jest.fn().mockResolvedValue(user) }
    return { user, userModel, entry: { models: { user: userModel } }, context: { state: { user: { id: user.id } } } }
}

describe('login helper', () => {
    it('authenticates the password, saves tokens and returns login information', async () => {
        const { user, entry } = createUserFixture()
        const result = await extras.generateLogin(entry)(null, { email: 'user@example.test', password: 'legacy-test-password' }, {})
        expect(user.save).toHaveBeenCalledTimes(1)
        expect(result).toEqual(expect.objectContaining({ token: expect.any(String), refreshToken: expect.any(String), user }))
    })

    it.each(['wrong password', 'unknown user'])('rejects %s without saving tokens', async (scenario) => {
        const { user, userModel, entry } = createUserFixture()
        if (scenario === 'unknown user') userModel.findOne.mockResolvedValue(null)
        await expect(extras.generateLogin(entry)(null, { email: 'user@example.test', password: 'wrong' }, {})).rejects.toBe('Email or password is not correct')
        expect(user.save).not.toHaveBeenCalled()
    })
})

describe('password change helper', () => {
    it('waits for database persistence before reporting success', async () => {
        const { user, entry, context } = createUserFixture()
        let finishSave: () => void
        let notifySaveStarted: () => void
        const saving = new Promise<void>((resolve) => {
            finishSave = resolve
        })
        const saveStarted = new Promise<void>((resolve) => {
            notifySaveStarted = resolve
        })
        user.save.mockImplementation(() => {
            notifySaveStarted()
            return saving
        })
        const result = extras.generateChangePassword(entry)(null, { oldPassword: 'legacy-test-password', newPassword: 'new-password' }, context)
        await saveStarted
        let complete = false
        result.then(() => {
            complete = true
        })
        await Promise.resolve()
        const completedBeforeSave = complete
        finishSave()
        const payload = await result
        expect(completedBeforeSave).toBe(false)
        expect(await extras.compareHash('new-password', user.__password)).toBe(true)
        expect(await extras.compareHash('legacy-test-password', user.__password)).toBe(false)
        expect(payload.token).toEqual(expect.any(String))
        expect(payload.refreshToken).toEqual(expect.any(String))
    })

    it('propagates database write failures', async () => {
        const { user, entry, context } = createUserFixture()
        user.save.mockRejectedValue(new Error('write failed'))
        await expect(extras.generateChangePassword(entry)(null, { oldPassword: 'legacy-test-password', newPassword: 'new-password' }, context)).rejects.toThrow('write failed')
    })

    it('rejects an incorrect old password without writing', async () => {
        const { user, entry, context } = createUserFixture()
        await expect(extras.generateChangePassword(entry)(null, { oldPassword: 'wrong', newPassword: 'new-password' }, context)).rejects.toBe('Unauthorized')
        expect(user.save).not.toHaveBeenCalled()
    })

    it('rejects anonymous access before looking up a user', async () => {
        const { userModel, entry } = createUserFixture()
        await expect(extras.generateChangePassword(entry)(null, {}, {})).rejects.toBe('Unauthorized')
        expect(userModel.findById).not.toHaveBeenCalled()
    })
})

it.each([{ email: 'forbidden@example.test' }, { password: 'forbidden' }])('blocks direct credential updates: %p', (data) => {
    expect(() => extras.checkPasswordIsNotIncluded(data)).toThrow(/User can change password only/)
})
