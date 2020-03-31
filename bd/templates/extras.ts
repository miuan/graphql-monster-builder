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
        const fd = {
          ...data
        }

        if(fd.id) {
          fd._id = fd.id
          delete fd.id
        }

        const u = await entry.models[modelName].findOne(fd, ownerField)
        console.log('OWNER CHECK : user1 >>', {u, fd, state: ctx.state, modelName, models: entry.models})
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
        console.log(data.filter)
        
        // if is something restricted to filter can't be filter behind OR
        // because it will pass security 
        // but show even data what is under protection
        if(data.filter.OR) {
          return false
        }

        let AND = null
        if(data.filter.AND) {
          AND = data.filter.AND
        } else if(data.filter.length) {
          AND = data.filter
        } else {
          AND = [data.filter]
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