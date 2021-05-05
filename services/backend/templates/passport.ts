import * as passport from 'koa-passport'
import {Strategy as FacebookStrategy} from 'passport-facebook'
import {Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import {Strategy as GitHubStrategy } from 'passport-github2'
import {OAuth2Strategy as GoogleStrategy } from 'passport-google-oauth'
import {Strategy as AnonymousStrategy } from 'passport-anonymous'


import * as Router from 'koa-router'

import {userModel} from '../gen/models/User'
import { genPasswordAndTokens } from '../gen/extras'

export const allSetup = (app) =>{
    jwtSetup(app)
    
    const authRouter = new Router( {prefix: '/auth' })
    
    othersSetup(authRouter) 
    
    app.use(authRouter.routes())
    app.use(authRouter.allowedMethods());
}

export const jwtSetup = (app) => {
    passport.serializeUser<any, any>((req, user, done) => {
        done(undefined, user);
    });
    
    passport.deserializeUser((id, done) => {
        console.log('deserializeUser', id)
        done(id)
    });

    // http://www.passportjs.org/packages/passport-jwt/
    passport.use(new JwtStrategy({
            jwtFromRequest: ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), ExtractJwt.fromUrlQueryParameter('token')]),
            secretOrKey: process.env.JWT_TOKEN_SECRET || 'protectql_test_secret'
        }, (jwt_payload, done) => {
        console.log('jwt_payload', jwt_payload)
        done(null, jwt_payload)
    }))

    passport.use(new AnonymousStrategy())
    
    // Initialize Passport and restore authentication state, if any, from the
    // session.
    app.use(passport.initialize());
    // app.use(passport.session());
    app.use(passport.authenticate(['jwt', 'anonymous']))
}

const checkIfStrategyConfigured = (config) => !!config.clientID || !!config.clientSecret || !!config.callbackURL

const checkErrorsInConfForStrategy = (config) => {
    const result = []

    if(!config.clientID){
        result.push('Client ID is empty')
    }

    if(!config.clientSecret){
        result.push('Client Secret is empty')
    }

    if(!config.callbackURL){
        result.push('Callback URL is empty')
    }

    if(config.callbackURL && (!config.callbackURL?.startsWith('http://') || !config.callbackURL?.startsWith('https://'))){
        result.push(`Callback URL should start with 'http://' or 'https://'`)
    }

    return result.length ? result : false
}


const setupStrategy = (passport, Strategy, name, config, cb) => {
    // not configured at all
    if(!checkIfStrategyConfigured(config)) return false

    // configured with errors
    const errors = checkErrorsInConfForStrategy(config)
    if(errors){
        console.log(`Strategy with name: ${name} have followed errors`, errors)
        return false
    }
    
    passport.use(name, new Strategy(config, cb))
    return true
}

const go = async (ctx) => {
    console.log('GO', ctx, ctx.req?.user)
   
    const userId = ctx.req?.user?.id
    const user = await userModel.findById(userId)
    
    genPasswordAndTokens(user)
    user.verified = true
    await user.save()
    
    ctx.body = {
        user:{
            id: user._id,
            email: user.email,
            roles: user.roles
        },
        token: user.__token,
        refreshToken: user.__refreshToken
    }

    // Successful authentication, redirect home.
   
}

export const othersSetup = (authRouter, name=null) => {
    const facebookName = name ? `facebook-${name}`: 'facebook'
    const githubName = name ? `github-${name}`: 'github'
    const googleName = name ? `google-${name}`: 'google'

    const facebookConnect = setupStrategy(passport, FacebookStrategy, facebookName, {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_APP_CALLBACK_URL,
        profileFields: ["name", "email", "link", "locale", "timezone"]
    },  (accessToken, refreshToken, profile, cb) => {
        console.log('Facebook profile', {accessToken, refreshToken, profile})
       userModel.findOne({ __password:  `facebook-id:${profile.id}`}, {_id: 1, roles:1}, (err, existingUser) => {
            if(existingUser) return cb(null, existingUser)

            userModel.create({email: `${profile.name.givenName} ${profile.name.familyName}`, roles:[], __password:`facebook-id:${profile.id}`, password:'*****'}, (errCreate, createdUser) => {
                cb(errCreate, createdUser)
            })
        })
    })


    const githubConnect = setupStrategy(passport, GitHubStrategy, githubName, {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CLIENT_CALLBACK_URL
    },  (accessToken, refreshToken, profile, cb) => {
        console.log('GitHub profile', {accessToken, refreshToken, profile})
        userModel.findOne({ __password:  `github-id:${profile.id}`}, {_id: 1, roles:1}, (err, existingUser) => {
            if(existingUser) return cb(null, existingUser)

            userModel.create({email: `${profile.emails[0]}`, roles:[], __password:`github-id:${profile.id}`, password:'*****'}, (errCreate, createdUser) => {
                cb(errCreate, createdUser)
            })
        })
    })


    const googleConnect = setupStrategy(passport, GitHubStrategy, githubName, {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CLIENT_CALLBACK_URL
    }, (request, accessToken, refreshToken, profile, done) => {
        (accessToken, refreshToken, profile, cb) => {
            console.log('GOOGLE profile', {accessToken, refreshToken, profile})
            userModel.findOne({ __password:  `google-id:${profile.id}`}, {_id: 1, roles:1}, (err, existingUser) => {
                if(existingUser) return cb(null, existingUser)
    
                userModel.create({email: `${profile.emails[0]}`, roles:[], __password:`google-id:${profile.id}`, password:'*****'}, (errCreate, createdUser) => {
                    cb(errCreate, createdUser)
                })
            })
        }
      }
    )

    
    if(facebookConnect){
        authRouter.get('/facebook', passport.authenticate(facebookName));
        authRouter.get('/facebook/callback', passport.authenticate(facebookName), go);
    }

    if(githubConnect){
        authRouter.get('/github', passport.authenticate(githubName, { scope: [ 'user:email' ] }));
        authRouter.get('/github/callback', passport.authenticate(githubName, { failureRedirect: '/login' }), go);
    }

    
    if(googleConnect){
        authRouter.get('/google', passport.authenticate(googleName, {scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ] }));
        authRouter.get('/google/callback', passport.authenticate(googleName, { failureRedirect: '/login' }), go);
    }
}

export default allSetup
