import * as bcrypt from 'bcrypt-nodejs';
import * as jwt from 'jsonwebtoken';
import * as _ from 'lodash'

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

  return tokenJWT;
};

export const genPasswordAndTokens = (userData) => {
  // TODO: schort the expire date
  const options = { expiresIn: '365d' };
  userData.token = generateTokenJWT({ id: userData.id, role: userData.role }, options);
  userData.refreshToken = generateTokenJWT({ id: userData.id }, options);
};


export const checkPasswordIsNotIncluded = (userData) => {
  if (userData.password) {
    throw 'User can change password only in userChangePasswordMutation(old, new)';
  }
};

export const generateLogin = (entry) => {
  return async (root, data, ctx) => {
    
    const user = await entry.models['user'].findOne({ email: data.email });

    if (user && bcrypt.compareSync(data.password, user._password)) {
      return user;
    }

    throw 'Email or password is not correct';
  };
};

export const generateChangePassword = (entry) => {
  return async (root, data, ctx) => {
    const userModel = entry.models['user'];
    const user = await userModel.findById(data.userId);

    console.log(data, user);
    if (!user) {
      throw `Unknown user with id: ${data.userId}`;
    }

    if (!bcrypt.compareSync(data.oldPassword, user._password)) {
      throw `Old password id different than is currently used`;
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      data.userId, 
      { _password:generateHash(data.newPassword) }, 
      { new: true },
    );

    return updatedUser;
  };
};

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
      
        const userRole = await userRoleModel.findOne({ role: roles[0], users: ctxUser.id });
      
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

        // TODO: is catch if secure filter is behind one $and example: filter: {$and:[{user: {{userId}}}]}
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


export const filterGen = (filter) => {

  console.log('DEBUG:FILTER', filter)
  let obj = {}

  if(!filter){
    return obj
  } else if(filter.AND) {
    return filterANDOR(filter.AND, '$and')
  } else if(filter.OR) {
    return filterANDOR(filter.OR, '$or')
  } 

  if(Object.keys(filter).length > 0) {
    for(const f in filter){
      const ff = filter[f]

      if(/_every$/.test(f)){
        obj[f.substr(0, f.length-6)] = filterGen(ff)
      } else if(/_none$/.test(f)){
        obj[f.substr(0, f.length-5)] = {'$not': filterGen(ff)}
      } else if(/_not_contains$/.test(f)){
        obj[f.substr(0, f.length-13)] = {$not: { "$regex": ff, "$options": "i" }}
      } else if(/_contains$/.test(f)){
        obj[f.substr(0, f.length-9)] = { "$regex": ff, "$options": "i" }
      } else if(/_not$/.test(f)){
        obj[f.substr(0, f.length-4)] = { $ne: ff }
      } else if(/_not_in$/.test(f)){
        obj[f.substr(0, f.length-7)] = { $not: { $in: ff } }
      } else if(/_in$/.test(f)){
        obj[f.substr(0, f.length-3)] = { $in: ff }
      } else if(/_not_starts_with$/.test(f)){
        obj[f.substr(0, f.length-16)] = {$not: { "$regex": `^${ff}`, "$options": "i" }}
      } else if(/_starts_with$/.test(f)){
        obj[f.substr(0, f.length-12)] = { "$regex": `^${ff}`, "$options": "i" }
      } else if(/_not_ends_with$/.test(f)){
        obj[f.substr(0, f.length-14)] = {$not: { "$regex": `${ff}$`, "$options": "i" }}
      } else if(/_ends_with$/.test(f)){
        obj[f.substr(0, f.length-10)] = { "$regex": `${ff}$`, "$options": "i" }
      } else if(/_lt$/.test(f)){
        obj[f.substr(0, f.length-3)] = { "$lt": ff }
      } else if(/_lt$/.test(f)){
        obj[f.substr(0, f.length-3)] = { "$lt": ff }
      } else if(/_lte$/.test(f)){
        obj[f.substr(0, f.length-4)] = { "$lte": ff }
      } else if(/_gt$/.test(f)){
        obj[f.substr(0, f.length-3)] = { "$gt": ff }
      } else if(/_gte$/.test(f)){
        obj[f.substr(0, f.length-4)] = { "$gte": ff }
      } else if(f == 'id') {
        obj['_id'] = ff
      } else if(typeof ff == 'string' || typeof ff == 'number') {
        obj = {...filter}
      } else {
        // TODO: stop going deeper than just object.id
        //       mongoose can't query populated fields
        //       https://stackoverflow.com/questions/17535587/mongoose-query-a-populated-field
        //       posible show message is funciton of prepaid version
        return filterGen(ff)
      }
    }
  } else {
    return filter
  }
  
  return obj
}