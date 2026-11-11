import { generateRefreshToken } from './extras'
import { generateTokenJWT, genPasswordAndTokens } from './jwt'
import * as jwt from 'jsonwebtoken'

describe('refresh authentication', () => {
    const originalSecret = process.env.JWT_TOKEN_SECRET
    beforeEach(() => { process.env.JWT_TOKEN_SECRET = 'refresh-tests-private-secret' })
    afterAll(() => {
        if (originalSecret === undefined) delete process.env.JWT_TOKEN_SECRET
        else process.env.JWT_TOKEN_SECRET = originalSecret
    })

    it('rejects expired refresh tokens before reading the database', async () => {
        const findOne = jest.fn()
        const refresh = generateRefreshToken({ models: { user: { findOne } } })
        await expect(refresh(null, {
            userId: 'user', token: 'old-access',
            refreshToken: generateTokenJWT({ id: 'user', tokenType: 'refresh' }, { expiresIn: -1 }),
        }, null)).rejects.toThrow()
        expect(findOne).not.toHaveBeenCalled()
    })

    it('rotates stored tokens, preserves roles and rejects reuse of the old token pair', async () => {
        const user: any = { id: 'user', roles: [{ name: 'admin' }], save: jest.fn() }
        genPasswordAndTokens(user)
        const old = { userId: user.id, token: user.__token, refreshToken: user.__refreshToken }
        const findOne = jest.fn((query) => ({ populate: async () =>
            query.__token === user.__token && query.__refreshToken === user.__refreshToken ? user : null,
        }))
        const refresh = generateRefreshToken({ models: { user: { findOne } } })
        const next = await refresh(null, old, null)
        expect(next.refreshToken).not.toBe(old.refreshToken)
        expect(user.save).toHaveBeenCalled()
        const payload = jwt.verify(next.token, process.env.JWT_TOKEN_SECRET) as jwt.JwtPayload
        expect(payload.roles).toEqual(user.roles)
        await expect(refresh(null, old, null)).rejects.toBe('Unauthorized')
    })
})
