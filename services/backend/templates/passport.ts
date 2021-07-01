import * as passport from 'koa-passport'
import { Strategy as FacebookStrategy } from 'passport-facebook'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { OAuth2Strategy as GoogleStrategy } from 'passport-google-oauth'
import { Strategy as AnonymousStrategy } from 'passport-anonymous'
import { genPasswordAndTokens } from '../gen/extras'
import * as Router from 'koa-router'

class TokenExpiredError extends Error {
    tokenExpired: boolean

    constructor() {
        super('Token expired')
        this.name = 'TokenExpiredError'
        this.tokenExpired = true
    }
}

class UnauthorizedError extends Error {
    unauthorized: boolean

    constructor() {
        super('Unauthorized')
        this.name = 'Unauthorized'
        this.unauthorized = true
    }
}

export const passportSetupAll = (app, userModel, config) => {
    passportSetupJwt(app, userModel)

    const authRouter = new Router({ prefix: '/auth' })

    const publicPassportConfig = passportSetup3Party(authRouter, userModel, config)

    app.use(authRouter.routes())
    app.use(authRouter.allowedMethods())

    return publicPassportConfig
}

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
                jwtFromRequest: ExtractJwt.fromExtractors([
                    ExtractJwt.fromAuthHeaderAsBearerToken(), 
                    ExtractJwt.fromUrlQueryParameter('token')
                ]),
                secretOrKey: process.env.JWT_TOKEN_SECRET || 'graphql_monster_test_secret',
                ignoreExpiration: true,
            },
            async (jwt_payload, done) => {
                if (Date.now() >= jwt_payload.exp * 1000) {
                    return done(new TokenExpiredError())
                } else if (!(await userModel.exists({_id: jwt_payload.id}))){
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

export const passportSetup3Party = (authRouter, userModel, config) => {
    const sentTokenFor3partyLogin = async (ctx) => {
        console.log('handleIncomingFrom3party', ctx, ctx.req?.user)

        const userId = ctx.req?.user?.id
        const user = await userModel.findById(userId)

        genPasswordAndTokens(user)
        await user.save()

        ctx.body = {
            user: {
                id: user._id,
                email: user.email,
                roles: user.roles,
            },
            token: user.__token,
            refreshToken: user.__refreshToken,
        }
    }

    const findOrCreateUser = (type) => (accessToken, refreshToken, profile, done) => {
        const email = profile.emails.length > 0 && profile.emails[0].value
        if (!email) {
            const capType = capitalizeFirstLetter(type)
            console.error(`Service ${capType} doesn't send a email. Without email we can't register a user`, profile)
            return done(new Error(`Service ${capType} doesn't send a email. Without email we can't register a user`))
        }
        const verified = profile.emails[0].verified
        const __password = `passport:${type}:${profile.id}`

        const handleExistiongUser = (err, existingUser) => {
            if (existingUser) return done(null, existingUser)

            userModel.create(
                {
                    email,
                    verified,
                    __password,
                    roles: [],
                    password: '*****',
                },
                (errCreate, createdUser) => {
                    if (errCreate && errCreate.message.match(/index: email_1 dup key/)) {
                        const capType = capitalizeFirstLetter(type)
                        console.error(
                            `You trying to register user through ${capType} but user with this email (${email}) already exist`,
                            profile,
                        )
                        return done(
                            new Error(
                                `You trying to register user through ${capType} but user with this email (${email}) already exist`,
                            ),
                        )
                    }

                    done(errCreate, createdUser)
                },
            )
        }

        userModel.findOne({ __password }, { _id: 1, roles: 1 }, null, handleExistiongUser)
    }

    if (githubActive(config)) {
        // https://github.com/settings/developers
        passport.use(
            new GitHubStrategy(
                {
                    clientID: config.GITHUB_CLIENT_ID,
                    clientSecret: config.GITHUB_CLIENT_SECRET,
                    callbackURL: `${config.SERVICE_URL}/login/github`,
                },
                findOrCreateUser('github'),
            ),
        )

        authRouter.get('/github', passport.authenticate('github', { scope: ['user:email'] }))
        authRouter.get(
            '/github/callback',
            passport.authenticate('github', { failureRedirect: '/login' }),
            sentTokenFor3partyLogin,
        )
    }

    if (googleActive(config)) {
        // https://console.cloud.google.com/apis/credentials?folder=&organizationId=&project=voc4uga
        passport.use(
            new GoogleStrategy(
                {
                    clientID: config.GOOGLE_CLIENT_ID,
                    clientSecret: config.GOOGLE_CLIENT_SECRET,
                    callbackURL: `${config.SERVICE_URL}/login/google`,
                    // callbackURL: "http://localhost/login/google"
                },
                findOrCreateUser('google'),
            ),
        )

        authRouter.get(
            '/google',
            passport.authenticate('google', {
                scope: [
                    'https://www.googleapis.com/auth/userinfo.profile',
                    'https://www.googleapis.com/auth/userinfo.email',
                ],
            }),
        )
        authRouter.get(
            '/google/callback',
            passport.authenticate('google', { failureRedirect: '/login' }),
            sentTokenFor3partyLogin,
        )
    }

    if (facebookActive(config)) {
        passport.use(
            new FacebookStrategy(
                {
                    clientID: config.FACEBOOK_APP_ID,
                    clientSecret: config.FACEBOOK_APP_SECRET,
                    callbackURL: `${config.SERVICE_URL}/login/facebook`,
                    profileFields: ['name', 'emails', 'link', 'locale', 'timezone'],
                },
                findOrCreateUser('facebook'),
            ),
        )

        authRouter.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }))
        authRouter.get('/facebook/callback', passport.authenticate('facebook'), sentTokenFor3partyLogin)
    }

    return publicPasswordConfig(config)
}

export function githubActive(config) {
    return !!config.GITHUB_CLIENT_ID && !!config.GITHUB_CLIENT_SECRET
}

export function googleActive(config) {
    return !!config.GOOGLE_CLIENT_ID && !!config.GOOGLE_CLIENT_SECRET
}

export function facebookActive(config) {
    return !!config.FACEBOOK_APP_ID && !!config.FACEBOOK_APP_SECRET
}

export function publicPasswordConfig(config) {
    return {
        GITHUB_CLIENT_ID: !!config.GITHUB_CLIENT_ID,
        GITHUB_CLIENT_SECRET: !!config.GITHUB_CLIENT_SECRET,
        githubActive: githubActive(config),
        GOOGLE_CLIENT_ID: !!config.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: !!config.GOOGLE_CLIENT_SECRET,
        googleActive: googleActive(config),
        FACEBOOK_APP_ID: !!config.FACEBOOK_APP_ID,
        FACEBOOK_APP_SECRET: !!config.FACEBOOK_APP_SECRET,
        facebookActive: facebookActive(config),
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
}

export default passportSetupAll
