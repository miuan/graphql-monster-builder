import * as bcrypt from 'bcrypt-nodejs';
import * as jwt from 'jsonwebtoken';
import * as _ from 'lodash'
import * as crypto from 'crypto'
import {sendMail, EMAIL_WELLCOME_TITLE, EMAIL_WELLCOME_MESSAGE} from '../services/sendMail'

export const generateHash = function (password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

/**
 *
 * @param user
 * @param options
 */
export const generateTokenJWT = (tokenizeData, opts?): string => {
  let options = opts || {};

  if (!options) {
    options = {
      /* expires in 365 days */
      expiresIn: '365d',
    };
  }

  
  const tokenJWT = jwt.sign(tokenizeData, process.env.JWT_TOKEN_SECRET || 'protectql_test_secret', options);
  console.log('generateTokenJWT', tokenizeData, tokenJWT)
  return tokenJWT;
};

export const genPasswordAndTokens = (userData) => {
  if(!userData.id){
    throw 'Call genPasswordAndTokens withou user.id'
  }
  // TODO: schort the expire date
  userData.__token = generateTokenJWT({ id: userData.id, roles: userData.roles || [] }, {expiresIn: '1h'});
  userData.__refreshToken = generateTokenJWT({ id: userData.id }, {expiresIn: '365d'});
}


export const checkPasswordIsNotIncluded = (userData) => {
  if (userData.email) {
    throw 'User can change password only in mutation changePassword_v1(old, new)';
  }

  if (userData.password) {
    throw 'User can change password only in mutation changePassword_v1(old, new)';
  }
};

export const generateLogin = (entry) => async (root, data, ctx) => {
  const user = await entry.models['user'].findOne({ email: data.email });

  if (user && bcrypt.compareSync(data.password, user.__password)) {
    // in login allways generate new token
    // if(!user.__token) {
      genPasswordAndTokens(user)
      await user.save()
    //}

    return {
      token: user.__token,
      refreshToken: user.__refreshToken,
      user
    };
  }

  throw 'Email or password is not correct';
}

export const generateRegister = (entry) => async (root, {email, password}, ctx) => {
  const userModel = await entry.models['user']
  
  const existing = await userModel.findOne({ email }, {'email': 1})
  if(existing){
    throw `User with email: ${existing.email} already exist`;
  }

  const __verifyToken = await createVerifyToken(userModel)
  const user = {
    email,
    __password: generateHash(password),
    password: '******',
    verified: false,
    __verifyToken
  } as any

  const createdUser = await userModel.create(user)
  // user have to be in DB to have his ID for generate token
  genPasswordAndTokens(createdUser)
  // save the tokens into model
  createdUser.save()
  
  sendVerifyEmail(createdUser)
  return {
    token: createdUser.__token,
    refreshToken: createdUser.__refreshToken,
    user:createdUser
  }
}

export const generateRefreshToken = (entry) => async (root, {userId: _id, token: __token, refreshToken: __refreshToken}, ctx) =>{
  const userModel = await entry.models['user']
  
  const userAboutToRefresh = await userModel.findOne({ _id, __token, __refreshToken }, {'__token': 1, '__refreshToken':1})
  if(!userAboutToRefresh){
    throw `Unauthorized`;
  }

  genPasswordAndTokens(userAboutToRefresh)
  await userAboutToRefresh.save()

  return {
    token: userAboutToRefresh.__token,
    refreshToken: userAboutToRefresh.__refreshToken,
  }
}

export const generateVerify = (entry) => async (root, {verifyToken}, ctx) => {
  const userModel = await entry.models['user']
  
  const userForVerify = await userModel.findOne({ __verifyToken: verifyToken })
  if(!userForVerify && !userForVerify.verified){
    throw `The email verify token '${verifyToken}' is incorect`
  }

  userForVerify.verified = true
  userForVerify.__verifyToken = undefined
  await userForVerify.save()

  return {
    token: userForVerify.__token,
    refreshToken: userForVerify.__refreshToken,
    user: userForVerify 
  }
}

export const generateLogout = (entry) => async (root, {email, password}, ctx) => {
  const userModel = await entry.models['user']
  const user = ctx.state.user
  if(user){
    const existing = await userModel.findById(user.id, {'__token': 1, '__refreshToken': 1})
    existing.__token = ''
    existing.__refreshToken = ''
    await existing.save()
  }
  
  return {
    status: 'logout'
  }
}

export const generateVerifyEmailResend = (entry) => async (root, {userId}, ctx) => {
  const userModel = await entry.models['user']

  const user = await userModel.findById(userId)

  if(!user){
    throw new Error(`Unknown user with id:'${userId}'`)
  }

  if(!user.__verifyToken){
    user.__verifyToken = await createVerifyToken(userModel)
    await user.save()
  }

  sendVerifyEmail(user)

  return {
    email: user.email,
    status: `sent`
  }
}

export const generateChangePassword = (entry) => async (root, data, ctx) => {
    if (!ctx || !ctx.state || !ctx.state.user) {
      throw `Unauthorized`;
    }

    const userModel = entry.models['user'];
    const userForUpdate = await userModel.findById(ctx.state.user.id);

    console.log(data, userForUpdate);
    if (!userForUpdate) {
      throw `Unknown user with id: ${data.userId}`;
    }

    if (!bcrypt.compareSync(data.oldPassword, userForUpdate.__password)) {
      throw `Unauthorized`;
    }

    userForUpdate.__password = generateHash(data.newPassword)
    genPasswordAndTokens(userForUpdate)

    userForUpdate.save()

    return {
      token: userForUpdate.__token,
      refreshToken: userForUpdate.__refreshToken,
      user: userForUpdate 
    }
}

const RESET_PASSWORD_TOKEN_SIZE = 64

export const generateForgottenPassword = (entry) => async (root, {email}, ctx) => {
  const userModel = await entry.models['user']
  
  const user = await userModel.findOne({email})

  if(!user){
    throw `User with ${email} not found`
  }

  // check existence of verify token
  let __resetPasswordToken
  let existingUserWithResetPasswordToken = null
  do {
    __resetPasswordToken = crypto.randomBytes(RESET_PASSWORD_TOKEN_SIZE).toString('hex')
    existingUserWithResetPasswordToken = await userModel.findOne({__forgottenPasswordToken: __resetPasswordToken})
  } while(existingUserWithResetPasswordToken)

  user.__resetPasswordToken = __resetPasswordToken
  
  await user.save()
  sendForgottenPasswordEmail(user)
  
  return {
    email: user.email,
    status: `sent`
  }
}

export const generateForgottenPasswordCheck = (entry) => async (root, {token}, ctx) => {
  const userModel = await entry.models['user']
  
  const userWithForgottenPassword = token.length/2 === RESET_PASSWORD_TOKEN_SIZE ? await userModel.findOne({__resetPasswordToken: token}) : null

  if(!userWithForgottenPassword){
    throw `The forgotten password token '${token}' is not valid`
  }

  return {
    token,
    status: `valid`
  }
}

export const generateForgottenPasswordReset = (entry) => async (root, {token, password}, ctx) => {
  const userModel = await entry.models['user']
  const user = token.length/2 === RESET_PASSWORD_TOKEN_SIZE ? await userModel.findOne({__resetPasswordToken: token}) : null

  if(!user){
    throw `The forgotten password token '${token}' is not valid`
  }

  user.__password = generateHash(password) 
  user.__resetPasswordToken = undefined
  genPasswordAndTokens(user)
  await user.save()

  return {
    token: user.__token,
    refreshToken: user.__refreshToken,
    user
  }
}

const createVerifyToken = async (userModel) => {
  // check existence of verify token
  let __verifyToken
  let existingUserWithVerifyToken = null
  do {
    __verifyToken = crypto.randomBytes(64).toString('hex')
    existingUserWithVerifyToken = await userModel.findOne({__verifyToken})
  } while(existingUserWithVerifyToken)

  return __verifyToken
}

const sendVerifyEmail = async (user) => {
  const welcome = EMAIL_WELLCOME_TITLE || 'Wellcome in {{SERVICE_NAME}}'
  const message = EMAIL_WELLCOME_MESSAGE || `Please verify your email by click to this <a href="{{SERVICE_URL}}/email/${user.__verifyToken}/verify">{{SERVICE_URL}}/email/${user.__verifyToken}/verify</a>`
  return sendMail(user.email, welcome, message)
}

const sendForgottenPasswordEmail = async (user) => {
  const welcome = EMAIL_WELLCOME_TITLE || 'Forgotten password {{SERVICE_NAME}} Request'
  const message = EMAIL_WELLCOME_MESSAGE || `Please verify your email by click to this <a href="{{SERVICE_URL}}/forgotten/${user.__verifyToken}/password">{{SERVICE_URL}}/forgotten/${user.__verifyToken}/password</a>`
  return sendMail(user.email, welcome, message)
}

export const generateParentLogin = (entry) => async (ctx) => {
  if(ctx.params.parentAccessToken != process.env.PARENT_ACCESS_TOKEN
    || ctx.params.parentUserId != process.env.PARENT_ACCESS_USER_ID){
    throw 'Unknown parent access token'
  }
  
  const adminEmail = process.env.ADMIN_EMAIL

  const user = await entry.models['user'].findOne({ email: adminEmail })
  if(!user.token) {
    genPasswordAndTokens(user)
    await user.save()
  }
  ctx.body = {token: user.token}
}



export const generateProtections = (entry, modelName) => {
  return {
    public: () => true,
    user: (ctx) => {
      if (ctx && ctx.state && ctx.state.user) {
        return true;
      }
    },
    owner: async (ctx, data, ownerField = 'user') => {
      if (ctx && ctx.state && ctx.state.user) {
        // NOTE: in edit, if `fd` contain also other fields, what they are edited
        //       then `await entry.models[modelName].findOne(fd)` not find anything
        //       because data are not corespond with what is in DB
        // const fd = {
        //   ...data
        // }
        // if(fd.id) {
        //   fd._id = fd.id
        //   delete fd.id
        // }
        // const u = await entry.models[modelName].findOne(fd, ownerField)
        
        const u = await entry.models[modelName].findById(data.id || data._id, ownerField)
        console.log('OWNER CHECK : user1 >>', {u, fd:(data.id || data._id), state: ctx.state, modelName, models: entry.models})
        console.log('u && u[ownerField] == ctx.state.user.id', u && u[ownerField] == ctx.state.user.id)
        return u && u[ownerField] == ctx.state.user.id;
      } else {
        return false
      }
    },
    role: async (ctx, roles: string[]) => {
      if (ctx && ctx.state && ctx.state.user) {
        const ctxUser = ctx.state.user;
        const userRoleModel = entry.models['userRole'];
      
        const userRole = await userRoleModel.findOne({ name: roles[0], users: ctxUser.id });
      
        return userRole != null;
      }
    },
    filter: async (ctx, data, filters: any[], roles: string[]) => {
      if (ctx && ctx.state && ctx.state.user) {
        const ctxUser = ctx.state.user;
        const dataFilter = data.filter || {}
 
        // if is something restricted to filter can't be filter behind OR
        // because it will pass security 
        // but show even data what is under protection
        if(dataFilter.OR) {
          return false
        }

        // TODO: INPORTANT! is catch if secure filter is behind one $and example: filter: {$and:[{user: {{userId}}}]}
        //       but not catch if is under depper $and ... example filter: {$and:[{$and:[{user: {{userId}}}]]}
        let AND = null
        if(dataFilter.AND) {
          AND = dataFilter.AND
        } else if(dataFilter.length) {
          AND = dataFilter
        } else {
          AND = [dataFilter]
        }

        for(let a of AND) {
          for(let filter of filters) {
            if(filter.name) {
              const value = _.get(a, filter.name)
              console.log('filter', filter.name, value)

              if(filter.value == value || (filter.value == '{{userId}}' && value == ctxUser.id)) {
                return true
              }
              // console.log('data.filter.AND', data.filter.AND)
              // console.log('data.filter.AND[0]', data.filter.AND[0])
              // console.log('data.filter.AND[0].user_every', data.filter.AND[0].user_every)
            }
          }
        }
        
      }
      return false
    },
    checkDataContainProtectedFields
  };
};

// ******************************
// * * *    F I L T E R     * * *
// ******************************

const filterANDOR = (filter, operator) => {
  if(filter.length == 1){
    return filterGen(filter[0])
  }
  else if(filter.length > 1) {
    const obj = {}
    obj[operator] = []
    for(const f of filter) {
      obj[operator].push(filterGen(f))
    }
    return obj
  } else {
    return undefined
  }

}


export const filterGen = (filters) => {

  console.log('DEBUG:FILTER', filters)
  let obj = {}

  if(!filters){
    return obj
  } else if(filters.AND) {
    return filterANDOR(filters.AND, '$and')
  } else if(filters.OR) {
    return filterANDOR(filters.OR, '$or')
  } 

  if(Object.keys(filters).length > 0) {
    for(const filterKey in filters){
      const filter = filters[filterKey]

      if(/_every$/.test(filterKey)){
        obj[filterKey.substr(0, filterKey.length-6)] = filterGen(filter)
      } else if(/_none$/.test(filterKey)){
        obj[filterKey.substr(0, filterKey.length-5)] = {'$not': filterGen(filter)}
      } else if(/_not_contains$/.test(filterKey)){
        obj[filterKey.substr(0, filterKey.length-13)] = {$not: { "$regex": filter, "$options": "i" }}
      } else if(/_contains$/.test(filterKey)){
        obj[filterKey.substr(0, filterKey.length-9)] = { "$regex": filter, "$options": "i" }
      } else if(/_not$/.test(filterKey)){
        obj[filterKey.substr(0, filterKey.length-4)] = { $ne: filter }
      } else if(/_not_in$/.test(filterKey)){
        obj[filterKey.substr(0, filterKey.length-7)] = { $not: { $in: filter } }
      } else if(/_in$/.test(filterKey)){
        obj[filterKey.substr(0, filterKey.length-3)] = { $in: filter }
      } else if(/_not_starts_with$/.test(filterKey)){
        obj[filterKey.substr(0, filterKey.length-16)] = {$not: { "$regex": `^${filter}`, "$options": "i" }}
      } else if(/_starts_with$/.test(filterKey)){
        obj[filterKey.substr(0, filterKey.length-12)] = { "$regex": `^${filter}`, "$options": "i" }
      } else if(/_not_ends_with$/.test(filterKey)){
        obj[filterKey.substr(0, filterKey.length-14)] = {$not: { "$regex": `${filter}$`, "$options": "i" }}
      } else if(/_ends_with$/.test(filterKey)){
        obj[filterKey.substr(0, filterKey.length-10)] = { "$regex": `${filter}$`, "$options": "i" }
      } else if(/_lt$/.test(filterKey)){
        obj[filterKey.substr(0, filterKey.length-3)] = { "$lt": filter }
      } else if(/_lt$/.test(filterKey)){
        obj[filterKey.substr(0, filterKey.length-3)] = { "$lt": filter }
      } else if(/_lte$/.test(filterKey)){
        obj[filterKey.substr(0, filterKey.length-4)] = { "$lte": filter }
      } else if(/_gt$/.test(filterKey)){
        obj[filterKey.substr(0, filterKey.length-3)] = { "$gt": filter }
      } else if(/_gte$/.test(filterKey)){
        obj[filterKey.substr(0, filterKey.length-4)] = { "$gte": filter }
      } else if(filterKey == 'id') {
        obj['_id'] = filter
      } else if(typeof filter == 'string' || typeof filter == 'number' || typeof filter == 'boolean') {
        obj = {...filters}
      } else {
        // TODO: stop going deeper than just object.id
        //       mongoose can't query populated fields
        //       https://stackoverflow.com/questions/17535587/mongoose-query-a-populated-field
        //       posible show message is funciton of prepaid version
        return filterGen(filter)
      }
    }
  } else {
    return filters
  }
  
  return obj
}

class ReachProtectedFields extends Error {
  fields: any

  constructor(protectedFields) {
    super(`Reach protected fields`)
    this.fields = protectedFields
  }
}

/**
 * should return any field with name starts double underscore example  `__port`, `__readolny`
 * 
 * @param data - data to check
 * @param path - actual path in data
 */
export const checkDataContainProtectedFields = (data, path='/') => {

  let founded = []
  const keys = Object.keys(data)
  if(keys.length > 0){
    for(const fieldName of keys){
      if(/^__/.test(fieldName) || /^_/.test(fieldName)){
        founded.push({name: fieldName, path: path})
      } else if(typeof(data[fieldName]) != 'string') {
        let fundedInDeep = checkDataContainProtectedFields(data[fieldName], `${path}${fieldName}/`)
        founded.push(...fundedInDeep)
      }
    }
  }

  return founded
}

export const createUser = async (entry, email: string, password: string, rolesIds: string[] = []) => {
  const userModel = entry.models['user']
  const userService = entry.services['user']

  let user = await userModel.findOne({email: email})

  if(!user) {
    // call service instead of simple model
    // because we want also create relation between user <- and -> roles
    user = await userService.create({email: email, __password: password, password:'*****', rolesIds})
    console.log(`User with email: ${email} and with pass: ${password} [CREATED]`, user)
  } else {
    user = await userService.update({__password: password, rolesIds}, user.id)
    console.log(`Update pass (${password}) to already existed user with email: ${email}`, user)
  }

  return user
}

export const createRole = async (entry, name: string) => {
  const userRoleModel = entry.models['userRole']
  let userRole = await userRoleModel.findOne({name})
  if(!userRole){
    userRole = await userRoleModel.create({name})
    console.log(`Role with name: ${name} [CREATED]`, userRole)
  } else {
    console.log(`Role with name: ${name} already exist`, userRole)
  }
  
  return userRole
}