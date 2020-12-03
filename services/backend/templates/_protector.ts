import * as bcrypt from './bcrypt-nodejs';
import * as jwt from './jsonwebtoken';
import * as randomtoken from './random-token';

import { userModel, IUserModel } from '../models/user';
import { Model, Error, Types } from './mongoose';

import { throwValidationError } from './db';

const ObjectId = Types.ObjectId;

const userIdNotValidError = (userId) => {
  throwValidationError('user', `User id:${userId} not valid`, userId, 'notvalid');
};

const userNotFoundError = (userId) => {
  throwValidationError('user', `User with id:${userId} not found`, userId, 'notfound');
};

/**
 * using for getUserByEmail or getUserById
 */
const USER_NOT_PUBLIC_FIELDS = [
  '-password',
  '-refreshToken',
  '-refreshTokenExpiresIn',
  '-refreshTokenCreatedAt',
];

const USER_POULATATE_FIELDS = [
  // NOTE: dataloader replaced the populates
];
const SECURED_PASSWORD = false;

export interface LoginInfo {
  token: string;
  refreshToken: string;
  user: IUserModel;
}

export class UserAlreadyExistError {
  constructor(public message: string) {
    // super(message);
  }

  public getMessage(): string {
    return this.message;
  }
}

export class UserPasswordToSimpleError {
  constructor(public message: string) {
    // super(message);
  }

  public getMessage(): string {
    return this.message;
  }
}

export const generateHash = function (password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

const populateAndExecUserQuery = async (userQuery) => {
  let userquery = userQuery.select(USER_NOT_PUBLIC_FIELDS);

  for (const populatedBy of USER_POULATATE_FIELDS) {
    userquery = userQuery.populate(populatedBy);
  }

  return await userquery.exec();
};

export const getAllUsers = async (): Promise<[Model<IUserModel>]> => {
  const u: [Model<IUserModel>] = await populateAndExecUserQuery(userModel.find({}));

  return u;
};

export const count = async (whatExactly = {}): Promise<[Model<IUserModel>]> => {
  return await userModel.count(whatExactly);
};

/**
 * One of main funciton for retrieve user withou not public fields
 *
 * @param email email of user
 */
export const getUserByEmail = async (email: string): Promise<Model<IUserModel>> => {
  const user = await populateAndExecUserQuery(userModel.findOne({ email }));

  return user;
};

/**
 * One of main funciton for retrieve user withou not public fields
 *
 * @param userId
 * @param haveToExists {Boolean} - if user dosn't exist throw exception (switch of by false)
 */
export const getUserById = async (userId: string, haveToExists = true): Promise<Model<IUserModel>> => {

  if (!ObjectId.isValid(userId)) {
    userIdNotValidError(userId);
  }

  const user = await populateAndExecUserQuery(userModel.findById(userId));

  if (!user && haveToExists) {
    userNotFoundError(userId);
  }

  return user;
};

/**
 * @param criteria
 * @returns {Promise<any>}
 */
export const find = async (criteria?): Promise<any> => {
  return await populateAndExecUserQuery(userModel.find(criteria));
};

/**
 * @param criteria
 * @returns {Promise<any>}
 */
export const findIds = async (criteria?): Promise<any> => {
  return await userModel.find(criteria).distinct('_id');
};

/**
 *
 * checking if password is valid
 *
 * @param user
 * @param password
 * @param callback
 */
export const validPassword = async (user: IUserModel, password: string) => {
  // find password for this user-object
  // and test if is valid
  const passwordForUser = await userModel.findById(user.id)
    .select('password')
    .exec();

  const valid = bcrypt.compareSync(password, passwordForUser.password);

  return valid;
};

/**
 *
 * @param user
 * @param options
 */
export const generateTokenJWT = ({ id, email, isAdmin }, opts?): string => {
  let options = opts || {};

  if (!options) {
    options = {
      /* expires in 365 days */
      expiresIn: '365d',
    };
  }

  // the TOKEN data
  // when it will be token in auth-header
  // ti will be always presented in ctx.state.user
  const tokenUser = {
    email,
    id,
    isAdmin,
  };

  const tokenJWT = jwt.sign(tokenUser, process.env.JWT_TOKEN_SECRET || 'pwc_test_secret', options);

  return tokenJWT;
};

/**
 *
 * @param options
 */
export const generateRefreshToken = function (user: IUserModel, opts?) {
  const options = opts || {};

  if (!options.expiresIn) {
    /* expires in 14 days */
    options.expiresIn = 86400000 * 14;
  }

  if (!options.length) {
    /* lenght of refresh token default is 32 */
    options.length = 32;
  }

  user.refreshToken = randomtoken(options.length);

  // TODO: refresh token expire
  user.refreshTokenCreatedAt = Date.now();
  user.refreshTokenExpiresIn = Date.now() + options.expiresIn;
};

export const validRefreshToken = function (user: IUserModel, refreshToken: string) {
  let valid = refreshToken === user.refreshToken;

  if (!valid) {
    throw 'validRefreshToken: refreshToken is invalid';
  }

  const timenow = Date.now();

  valid = user.refreshTokenExpiresIn > timenow;

  if (!valid) {
    throw 'validRefreshToken:refreshToken is expired';
  }

  return valid;
};

export const encryptRefreshToken = function (refreshToken) {
  return bcrypt.hashSync(refreshToken, bcrypt.genSaltSync(8), null);
};

/**
 * Main funciton for login
 *
 * @param email
 * @param password
 * @param options - mostly for testing purpose, set jwt expiration and refresh token expiration
 */
export const login = async (email: string, password: string, opts?: any): Promise<LoginInfo> => {
  const options = opts || {};

  let valid = false;

  const user: Model<IUserModel> = await getUserByEmail(email);

  if (!user || !user.isEnabled) {
    // user not found or disabled
    return null;
  }

  valid = await validPassword(user, password);

  if (!valid) {
    return null;
  }

  const tokenJWT = generateTokenJWT(user, options.jwt);
  generateRefreshToken(user, options.refreshToken);

  await user.save();

  const loginInfo: LoginInfo = { user, token: tokenJWT, refreshToken: user.refreshToken };

  // after save is not need information for loginInfo
  user.refreshToken = undefined;
  user.refreshTokenCreatedAt = undefined;
  user.refreshTokenExpiresIn = undefined;

  return loginInfo;
};

/**
 * Enable specified user for not allow to log in
 *
 * @param userId - id of user you would like to enable
 * @param isEnable {true} =>
 *                    FALSE: user can any more log in,
 *                    TRUE: user is posible login (enable)
 *
 * @return actual state of isEnable {true} or {false}
 */
export const userEnable = async (userId: string, isEnabled: boolean): Promise<Boolean> => {
  const user = await getUserById(userId);

  user.isEnabled = isEnabled;

  const savedUser = await user.save();

  return savedUser.isEnabled;
};


/**
 *
 * @param email
 * @param fullname
 * @param passwordLength
 */
export const createUserWithEmail = async (email: string, fullname: string, passwordLength = 8): Promise<any> => {
  const generatedPassword = randomtoken(passwordLength);

  const newUser = new userModel({
    email,
    fullname,
    password: generateHash(generatedPassword),
    isAdmin: false,
  });

  const savedUser = await newUser.save();

  // reduce the info of created user
  savedUser.password = undefined;

  return {
    user: savedUser,
    password: generatedPassword,
  };
};

/**
 *
 * @param email
 * @param password
 * @return LoginInfo - token, refreshToken, user, ...
 */
export const signup = async (email: string, password: string, fullname: string, createdById: string): Promise<LoginInfo> => {
  const testIfExist = await getUserByEmail(email);

  if (testIfExist) {
    // DEBUG:
    // console.log('testIfExists', testIfExist);

    throw new UserAlreadyExistError(`User with email '${email}' already exists`);
  }

  if (password.length < 5) {
    throw new UserPasswordToSimpleError('password is too short');
  }

//
// tslint:disable-next-line:max-line-length
// https://stackoverflow.com/questions/14850553/javascript-regex-for-password-containing-at-least-8-characters-1-number-1-uppe
// tslint:disable-next-line:max-line-length
// https://stackoverflow.com/questions/7844359/password-regex-with-min-6-chars-at-least-one-letter-and-one-number-and-may-cont?noredirect=1&lq=1
//
  if (SECURED_PASSWORD) {
    // TODO: merge all errors to one, avoid user will change password step by step
    if (!password.match(/\d/)) {
      throw new UserPasswordToSimpleError('password must contain at least one number');
    }

    if (!password.match(/[a-z]/)) {
      throw new UserPasswordToSimpleError('password must contain at least one letter lower case');
    }

    if (!password.match(/[A-Z]/)) {
      throw new UserPasswordToSimpleError('password must contain at least one letter upper case');
    }

    if (password.match(/[^a-zA-Z0-9\!\@\#\$\%\^\&\*\(\)\_\+\.\,\;\:]/)) {
      throw new UserPasswordToSimpleError(`
        password have not allowed character,
        supported characters:!@#$%*\_+.,;:
      `);
    }
  }


  const newUser = new userModel();

  // set the user's local credentials
  newUser.email = email;
  newUser.fullname = fullname;
  newUser.createdBy = createdById;
  newUser.password = generateHash(password);

  await newUser.save();

  const loginInfo = await this.login(email, password);

  return loginInfo;
};

/**
 *
 * @param ctx - koa context have contained state
 * @return true - if current user in context is a admin
 */
export const isUserRoleAsAdmin = (user) => {

  return user &&
    user.id &&
    user.isAdmin;
};

/**
 * check if in context is User with UserRole:Admin
 * throw exception with not permit action
 *
 * @param ctx - koa context
 * @param passThru - default:false, but true -> not throw exception
 *
 * @return true - if User have UserRole:Admin
 */
export const adminCheck = (ctx, passThru = false): boolean => {
  const state = ctx.state;

  let admin = false;

  if (state && state.user) {
    admin = isUserRoleAsAdmin(state.user);
  }

  if (!admin && !passThru) {
    ctx.throw(401, 'For this action is needed User with UserRole:Admin');
  }

  return admin;
};

type testIfUserIsOwnerFn = (data: any, logedUserId: string) => Promise<boolean>;
type testIfUserHavePermition = () => Promise<boolean>;

/**
 * check if in context is User Owner or Admin
 * throw exception with not permit action
 *
 * @param ctx - koa context
 * @param passThru - default:false, but true -> not throw exception
 *
 * @return true - if User Owner or Admin
 */
export const ownerCheck = async (ctx, data: any, testIfOwner: testIfUserIsOwnerFn = null, passThru = false): Promise<boolean> => {
  let permited = false;

  if (tryIfCurrentContextHaveUser(ctx)) {
    const state = ctx.state;
    // test if admin
    permited = adminCheck(ctx, true);

    // maybe if not Admin, is a owner
    if (!permited && testIfOwner) {
      // check owner on second step because
      // in testIfOwner will usually touch with data in database
      // and check it, that not make sence if user is actualy admin
      try {
        permited = await testIfOwner(data, state.user.id);
      } catch (ex) {
        // in testIfOwner could happend the object
        // will be not found because wrong id
        // instead of telling you have wrong ID
        // we will tell you do not have permission
        permited = false;
      }
      
    }

  }

  if (!permited && !passThru) {
    ctx.throw(401, 'For this action is needed User with UserRole:Owner or UserRole:Admin');
  }

  return permited;
};

export const userCheck = async (ctx, passThru = false) => {
  let permited;

  permited = tryIfCurrentContextHaveUser(ctx);

  if (!permited && !passThru) {
    ctx.throw(401, 'For this action is needed User with UserRole:Any');
  }

  return permited;
};

/**
 * check if in context is a User
 * throw exception with not permit action
 * TODO: throw ecception for koa-resolver : 401 unauthorized
 *
 * @param ctx - koa context
 * @param passThru - default:false, but true -> not throw exception
 *
 * @return true - if context have a User with id
 */
export const tryIfCurrentContextHaveUser = (ctx, passThru = false): boolean => {
  const state = ctx.state;

  const userExists = state && state.user && state.user.id;

  if (!userExists && !passThru) {
    throw 'For this action is needed loged User';
  }

  return userExists;
};

/**
 *
 * @param token Authorization JWT token as string
 */
export const tokenVerify = (token): LoginInfo => {
  if (!token) {
    throw 'token missing';
  }

  const decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET || 'pwc_test_secret') as LoginInfo;

  return decoded;
};

/**
 *
 * @param token
 * @param refreshToken
 * @param options
 */
export const tokenRefresh = async (token: String, refreshToken: string, opts?): Promise<LoginInfo> => {
  if (!token) {
    throw 'token missing';
  }

  const options = opts || {};

  const decoded = jwt.decode(token, process.env.JWT_TOKEN_SECRET || 'pwc_test_secret');


  // find password for this user-object
  // and test if is valid
  const user = await userModel.findById(decoded.id)
    .select(['email', 'refreshToken', 'refreshTokenExpiresIn', 'refreshTokenCreatedIn'])
    .exec();

  const refreshTokenValid = validRefreshToken(user, refreshToken);


  // create new refresh token
  if (refreshTokenValid) {

    const tokenJWT = generateTokenJWT(user, options.jwt);

    // console.log(' user.generateRefreshToken #1', user.refreshToken, refreshToken)
    generateRefreshToken(user, options.refreshToken);
    // console.log(' user.generateRefreshToken #2', user.refreshToken, refreshToken)
    const savedUser = await user.save();
    // console.log(' user.generateRefreshToken #3', savedUser.refreshToken, refreshToken)

    return { user, token: tokenJWT, refreshToken: savedUser.refreshToken } as LoginInfo;

  }

  throw 'refresh token is already expired';
};

const passwordIsPresent = async (userData) => {
  if (userData.password) {
    userData.password = generateHash(userData.password);
  }

};


const checkWhatIsPresent = async (userData) => {
  return Promise.all([
    passwordIsPresent(userData),
  ]);
};

export const createUser = async (userData) => {
  await checkWhatIsPresent(userData);

  const user = new userModel(userData);

  await user.save();

  // avoid return secred fields as password, ...
  return getUserById(user.id);
};



/**
 * @param id
 * @param updateData
 * @returns {Promise<any>}
 */
export const updateUserById = async (id, updateData) => {

  await checkWhatIsPresent(updateData);

  await userModel.findByIdAndUpdate(id, updateData);

  // avoid return secred fields as password, ...
  return getUserById(id);
};

export const deleteUserById = async (id, deleteAlsoReports = false) => {

  await userModel.findByIdAndRemove(id);
};

export const createUserIfNotExist = async (email, password, fullname, isAdmin = false) => {
  const oldUser = await getUserByEmail(email);
  if (oldUser) {
    return oldUser;
  }

  return await createUser({ email, password, fullname, isAdmin });
};

// create first admin if not exist
createUserIfNotExist('admin@admin.com', 'admin', 'Administratovic Adminer', true);
