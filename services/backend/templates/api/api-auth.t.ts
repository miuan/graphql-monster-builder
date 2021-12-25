import * as passport from 'koa-passport'
import * as bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'
import * as _ from 'lodash'
import * as crypto from 'crypto'
import * as Router from 'koa-router'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import { Strategy as AnonymousStrategy } from 'passport-anonymous'

import { apiMiddleware, TokenExpiredError, UnauthorizedError } from './api-utils'

export const passportSetupJwt = (app, userModel) => {
    // const authRouter = new Router({ prefix: '/auth' })
    passport.serializeUser<any, any>((req, user, done) => {
        done(undefined, user)
    })

    passport.deserializeUser((id, done) => {
        console.log('deserializeUser', id)
        done(id)
    })

    // http://www.passportjs.org/packages/passport-jwt/
    passport.use(
        new JwtStrategy(
            {
                jwtFromRequest: ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), ExtractJwt.fromUrlQueryParameter('token')]),
                secretOrKey: process.env.JWT_TOKEN_SECRET || 'graphql_monster_test_secret',
                ignoreExpiration: true,
            },
            async (jwt_payload, done) => {
                if (Date.now() >= jwt_payload.exp * 1000) {
                    return done(new TokenExpiredError())
                } else if (!(await userModel.exists({ _id: jwt_payload.id }))) {
                    return done(new UnauthorizedError())
                }
                done(null, jwt_payload)
            },
        ),
    )

    passport.use(new AnonymousStrategy())

    // Initialize Passport and restore authentication state, if any, from the session.
    // It is use for GithubStrategy, GoogleStrategy, FacebookStrategy, ...
    app.use(passport.initialize())
    app.use(passport.authenticate(['jwt', 'anonymous']))
}

export async function generateHash(password) {
    return bcrypt.hash(password, 10)
}

export async function compareHash(pass, hashPass) {
    return bcrypt.compare(pass, hashPass)
}

/**
 *
 * @param user
 * @param options
 */
export const generateTokenJWT = (tokenizeData, opts?): string => {
    let options = opts || {}

    if (!options) {
        options = {
            /* expires in 365 days */
            expiresIn: '365d',
        }
    }

    const tokenJWT = jwt.sign(tokenizeData, process.env.JWT_TOKEN_SECRET || 'graphql_monster_test_secret', options)
    return tokenJWT
}

export const genPasswordAndTokens = (userData) => {
    if (!userData.id) {
        throw 'Call genPasswordAndTokens withou user.id'
    }
    // TODO: schort the expire date
    userData.__token = generateTokenJWT({ id: userData.id, roles: userData.roles || [] }, { expiresIn: '1h' })
    userData.__refreshToken = generateTokenJWT({ id: userData.id }, { expiresIn: '365d' })
}

const createVerifyToken = async (userModel) => {
    // check existence of verify token
    let __verifyToken
    do {
        __verifyToken = crypto.randomBytes(64).toString('hex')
    } while (await userModel.exists({ __verifyToken }))

    return __verifyToken
}

async function _login(userModel, data) {
    const user = await userModel.findOne({ email: data.email })

    if (user && (await compareHash(data.password, user.__password))) {
        // in login allways generate new token
        // if(!user.__token) {
        genPasswordAndTokens(user)
        await user.save()
        //}

        const data = {
            token: user.__token,
            refreshToken: user.__refreshToken,
            user,
        }

        // clean user
        data.user.__password = undefined
        data.user.__forgottenPasswordToken = undefined
        data.user.__resetPasswordToken = undefined
        data.user.__token = undefined
        data.user.__refreshToken = undefined

        return data
    }

    throw new UnauthorizedError()
}

async function _register(userModel, data) {
    const { password, email } = data

    if (await userModel.exists({ email })) {
        throw `User with email: ${email} already exist`
    }

    delete data.password
    const __verifyToken = await createVerifyToken(userModel)
    const __password = await generateHash(password)
    const user = {
        ...data,
        __password,
        password: '******',
        verified: false,
        __verifyToken,
    } as any

    const createdUser = await userModel.create(user)
    // user have to be in DB to have his ID for generate token
    genPasswordAndTokens(createdUser)
    // save the tokens into model
    createdUser.save()

    return {
        token: createdUser.__token,
        refreshToken: createdUser.__refreshToken,
        user: createdUser,
    }
}

/**
 *
 * @swagger
 * # components:
 * parameters:
 *   fieldsParam:
 *       in: query
 *       name: fields
 *       type: array
 *       collectionFormat: csv
 *       items:
 *         type: string
 *   aliasParam:
 *       in: query
 *       name: alias
 *       type: string
 *
 *
 *
 * /auth/login_v1:
 *   post:
 *     summary: "Rest API login users"
 *     consumes:
 *       - application/json
 *     parameters:
 *        - $ref: '#/parameters/fieldsParam'
 *        - $ref: '#/parameters/aliasParam'
 *        - in: body
 *          name: login
 *          description: The user to create.
 *          schema:
 *            type: object
 *            required:
 *              - userName
 *            properties:
 *                     email:          # <!--- form field name
 *                       type: string
 *                     password:          # <!--- form field name
 *                       type: string
 *     responses:
 *       '200':
 *         description: "User succesfully loged"
 *       '401':
 *         description: "Unauthorized"
 *
 *
 *
 * responses:
 *  '401':
 *    description: Authorization information is missing or invalid.
 *
 */
const login_v1 = (userModel) => async (ctx) => (ctx.body = apiMiddleware(ctx, await _login(userModel, ctx.request.body), 'login_v1'))

/**
 *
 * @swagger
 *
 * /auth/register_v1:
 *   post:
 *     summary: "Rest API register user"
 *     consumes:
 *       - application/json
 *     parameters:
 *        - $ref: '#/parameters/fieldsParam'
 *        - $ref: '#/parameters/aliasParam'
 *        - in: body
 *          name: register
 *          description: The user to create.
 *          schema:
 *            type: object
 *            required:
 *              - userName
 *            properties:
 *                     email:          # <!--- form field name
 *                       type: string
 *                     password:          # <!--- form field name
 *                       type: string
 *     responses:
 *       '200':
 *         description: "User succesfully loged"
 *       '401':
 *         description: "Unauthorized"
 *
 *
 *
 * responses:
 *  401:
 *    description: Authorization information is missing or invalid.
 *
 */
const register_v1 = (userModel) => async (ctx) => (ctx.body = apiMiddleware(ctx, await _register(userModel, ctx.request.body), 'register_v1'))

export const setupAuth = (app, userModel) => {
    passportSetupJwt(app, userModel)

    const authRouter = new Router({ prefix: '/auth' })
    authRouter.post('/login_v1', login_v1(userModel))
    authRouter.post('/register_v1', register_v1(userModel))
    return authRouter
}

export default setupAuth
