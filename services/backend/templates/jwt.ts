import * as jwt from 'jsonwebtoken'
import * as crypto from 'crypto'

export const getJwtSecret = (): string => {
    const secret = process.env.JWT_TOKEN_SECRET || process.env.JWT_TOKEN_SECRET_GEN
    if (!secret || !secret.trim() || secret === 'graphql_monster_test_secret') {
        throw new Error('Set JWT_TOKEN_SECRET or regenerate the server to create JWT_TOKEN_SECRET_GEN')
    }
    return secret
}

export const generateTokenJWT = (payload, options: jwt.SignOptions = {}): string =>
    jwt.sign(payload, getJwtSecret(), {
        expiresIn: '1h',
        jwtid: crypto.randomBytes(16).toString('hex'),
        ...options,
        algorithm: 'HS256',
    })

export const verifyRefreshToken = (token: string, userId: string) => {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] })
    if (typeof payload !== 'object' || payload.tokenType !== 'refresh' || payload.id !== userId || !Number.isFinite(payload.exp)) {
        throw new Error('Unauthorized')
    }
    return payload
}

export const genPasswordAndTokens = (userData) => {
    if (!userData.id) throw new Error('Cannot generate tokens without a user id')
    userData.__token = generateTokenJWT({ id: userData.id, roles: userData.roles || [], tokenType: 'access' })
    userData.__refreshToken = generateTokenJWT({ id: userData.id, tokenType: 'refresh' }, { expiresIn: '365d' })
}
