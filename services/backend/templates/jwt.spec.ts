import * as jwt from 'jsonwebtoken'
import { generateTokenJWT, genPasswordAndTokens, getJwtSecret, verifyRefreshToken } from './jwt'

const secret = 'jwt-unit-tests-private-secret'

describe('JWT tokens', () => {
    const originalGeneratedSecret = process.env.JWT_TOKEN_SECRET_GEN
    const originalSecret = process.env.JWT_TOKEN_SECRET
    beforeEach(() => {
        process.env.JWT_TOKEN_SECRET = secret
        delete process.env.JWT_TOKEN_SECRET_GEN
    })
    afterAll(() => {
        if (originalGeneratedSecret === undefined) delete process.env.JWT_TOKEN_SECRET_GEN
        else process.env.JWT_TOKEN_SECRET_GEN = originalGeneratedSecret
        if (originalSecret === undefined) delete process.env.JWT_TOKEN_SECRET
        else process.env.JWT_TOKEN_SECRET = originalSecret
    })

    it('requires an explicit secret and rejects the previous public fallback', () => {
        for (const value of ['', '   ', 'graphql_monster_test_secret']) {
            process.env.JWT_TOKEN_SECRET = value
            expect(getJwtSecret).toThrow('JWT_TOKEN_SECRET')
        }
        delete process.env.JWT_TOKEN_SECRET
        expect(getJwtSecret).toThrow('JWT_TOKEN_SECRET')
    })

    it('uses the generated secret unless an explicit secret is configured', () => {
        process.env.JWT_TOKEN_SECRET_GEN = 'generated-secret'
        expect(getJwtSecret()).toBe(secret)
        delete process.env.JWT_TOKEN_SECRET
        expect(getJwtSecret()).toBe('generated-secret')
        const token = generateTokenJWT({ id: 'user' })
        expect(() => jwt.verify(token, 'generated-secret')).not.toThrow()
    })

    it('defaults to an access token lifetime of one hour', () => {
        const payload = jwt.verify(generateTokenJWT({ id: 'user' }), secret) as jwt.JwtPayload
        expect(payload.exp - payload.iat).toBe(3600)
    })

    it('issues distinct access and refresh tokens and rotates even within the same second', () => {
        const user: any = { id: 'user', roles: [{ name: 'admin' }] }
        genPasswordAndTokens(user)
        const access = jwt.verify(user.__token, secret) as jwt.JwtPayload
        expect(access.tokenType).toBe('access')
        expect(access.roles).toEqual(user.roles)
        const refresh = verifyRefreshToken(user.__refreshToken, 'user')
        expect(refresh.exp - refresh.iat).toBe(365 * 24 * 3600)
        const oldRefresh = user.__refreshToken
        genPasswordAndTokens(user)
        expect(user.__refreshToken).not.toBe(oldRefresh)
        expect(() => verifyRefreshToken(user.__token, 'user')).toThrow()
        expect(() => verifyRefreshToken(user.__refreshToken, 'someone-else')).toThrow()
    })

    it('rejects expired, unsigned, wrong-key and wrong-algorithm refresh tokens', () => {
        const payload = { id: 'user', tokenType: 'refresh' }
        const invalid = [
            generateTokenJWT(payload, { expiresIn: -1 }),
            jwt.sign(payload, '', { algorithm: 'none' }),
            jwt.sign(payload, 'different-secret', { expiresIn: '1h' }),
            jwt.sign(payload, secret, { algorithm: 'HS384', expiresIn: '1h' }),
            jwt.sign(payload, secret),
        ]
        for (const token of invalid) expect(() => verifyRefreshToken(token, 'user')).toThrow()
    })
})
