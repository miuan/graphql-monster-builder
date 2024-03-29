import { SchemaModel, SchemaModelProtection, SchemaModelProtectionParam, SchemaModelProtectionType, SchemaModelRelationType, SchemaModelType } from '../common/types'
import { firstToLower } from '../common/utils'
import { setupRelationLinkNames } from './relations'

const DEFAULT_ADMIN_ROLE: SchemaModelProtectionParam = {
    roles: ['admin'],
    type: SchemaModelProtectionType.ROLE,
}

const DEFAULT_OWNER_ROLE: SchemaModelProtectionParam = {
    type: SchemaModelProtectionType.OWNER,
} as any

const USER_MEMBERS = [
    {
        name: 'email',
        type: 'String',
        modelName: 'String',
        isArray: false,
        isRequired: true,
        isUnique: true,
        isVirtual: false,
        isReadonly: true,
        relation: null,
        isSystem: true,
        row: -1,
    },
    {
        name: 'password',
        type: 'String',
        modelName: 'String',
        isArray: false,
        isRequired: true,
        isUnique: false,
        isVirtual: false,
        isReadonly: true,
        relation: null,
        default: '*****',
        isSystem: true,
        row: -1,
    },
    {
        name: 'verified',
        type: 'Boolean',
        modelName: 'Boolean',
        isArray: false,
        isRequired: false,
        isUnique: false,
        isVirtual: false,
        isReadonly: true,
        relation: null,
        isSystem: true,
        row: -1,
    },
]

const USER_MODEL = {
    modelName: 'User',
    protection: {
        all: [DEFAULT_ADMIN_ROLE],
        one: [DEFAULT_OWNER_ROLE],
        create: [DEFAULT_ADMIN_ROLE],
        update: [DEFAULT_OWNER_ROLE],
        remove: [DEFAULT_ADMIN_ROLE],
    },
    members: USER_MEMBERS,
    start: -1,
    end: -1,
    type: SchemaModelType.MODEL,
}

const USERROLE_MODEL = {
    modelName: 'UserRole',
    protection: {
        all: [DEFAULT_ADMIN_ROLE],
        one: [DEFAULT_ADMIN_ROLE],
        create: [DEFAULT_ADMIN_ROLE],
        update: [DEFAULT_ADMIN_ROLE],
        remove: [DEFAULT_ADMIN_ROLE],
    },
    members: [
        {
            name: 'name',
            modelName: 'String',
            type: 'String',
            isRequired: true,
            isUnique: true,
            relation: null,
            isArray: false,
            isVirtual: false,
            isReadonly: false,
            isSystem: true,
            row: -1,
        },
    ],
    start: -1,
    end: -1,
    type: SchemaModelType.MODEL,
}

const FILE_MEMBERS = [
    {
        name: 'name',
        modelName: 'String',
        type: 'String',
        isRequired: true,
        isUnique: false,
        relation: null,
        isArray: false,
        isVirtual: false,
        isReadonly: false,
        isSystem: true,
        row: -1,
    },
    {
        name: 'publicKey',
        modelName: 'String',
        type: 'String',
        isArray: false,
        isUnique: true,
        isVirtual: false,
        isReadonly: true,
        isRequired: true,
        relation: null,
        isSystem: true,
        row: -1,
    },
    {
        name: 'type',
        modelName: 'String',
        type: 'String',
        isRequired: true,
        isUnique: false,
        relation: null,
        isArray: false,
        isVirtual: false,
        isReadonly: false,
        default: 'text/plain',
        isSystem: true,
        row: -1,
    },
    {
        name: 'size',
        modelName: 'Int',
        type: 'Int',
        isRequired: true,
        isUnique: false,
        relation: null,
        isArray: false,
        isVirtual: false,
        isReadonly: true,
        isSystem: true,
        row: -1,
    },
    {
        name: 'data',
        modelName: 'String',
        type: 'String',
        isRequired: true,
        isUnique: false,
        relation: null,
        isArray: false,
        isVirtual: true,
        isReadonly: false,
        isSystem: true,
        row: -1,
    },
]

const FILE_MODEL = {
    modelName: 'File',
    protection: {
        all: [DEFAULT_ADMIN_ROLE],
        one: [DEFAULT_OWNER_ROLE],
        create: [DEFAULT_ADMIN_ROLE],
        update: [DEFAULT_ADMIN_ROLE],
        remove: [DEFAULT_OWNER_ROLE],
    },
    members: FILE_MEMBERS,
    start: -1,
    end: -1,
    type: SchemaModelType.MODEL,
}

export const addDefaultModelsAndMembers = (models: SchemaModel[]) => {
    let modelUser = models.find((m) => m.modelName == 'User')
    let modelFile = models.find((m) => m.modelName == 'File')
    // create new array of members because in server
    // because in one instance is run export
    // multiple times the members are increasing
    const modelUserRole = JSON.parse(JSON.stringify(USERROLE_MODEL))
    models.push(modelUserRole)

    if (!modelUser) {
        modelUser = JSON.parse(JSON.stringify(USER_MODEL))
        models.push(modelUser)
    } else {
        modelUser.members.push(...JSON.parse(JSON.stringify(USER_MEMBERS)))
    }

    if (!modelFile) {
        modelFile = JSON.parse(JSON.stringify(FILE_MODEL))
        models.push(modelFile)
    } else {
        modelFile.members.push(...JSON.parse(JSON.stringify(FILE_MEMBERS)))
    }

    // User relation to roles
    const memberRolesInUser = {
        name: 'roles',
        type: '[UserRole]',
        modelName: 'UserRole',
        isArray: true,
        isRequired: false,
        isUnique: false,
        isVirtual: false,
        isReadonly: false,
        isSystem: true,
        row: -1,
        relation: {
            createFromAnotherModel: true,
            inputName: 'UserrolesUserRole',
            name: '_RoleToUser',
            relatedModel: modelUserRole,
            type: SchemaModelRelationType.RELATION,
            payloadNameForCreate: 'roles',
            payloadNameForId: 'rolesIds',
        } as any,
    }
    modelUser.members.push(memberRolesInUser)

    // roles relation to user
    const memberUsersInUserRole = {
        name: 'users',
        type: '[User]',
        modelName: 'User',
        isArray: true,
        isRequired: false,
        isUnique: false,
        isVirtual: false,
        isReadonly: false,
        isSystem: true,
        row: -1,
        relation: {
            createFromAnotherModel: false,
            inputName: 'UserRoleusersUser',
            name: '_RoleToUser',
            relatedModel: modelUser,
            relatedMember: memberRolesInUser,
            type: SchemaModelRelationType.RELATION,
            payloadNameForCreate: 'users',
            payloadNameForId: 'usersIds',
        } as any,
    }
    modelUserRole.members.push(memberUsersInUserRole)
    memberRolesInUser.relation.relatedMember = memberUsersInUserRole
    memberRolesInUser.relation.linkNames = setupRelationLinkNames(memberRolesInUser)
    // memberRolesInUser.relation.linkNames.param3 = 'role'

    // memberUserInFile.relation.linkNames = setupRelationLinkNames(memberUserInFile)
    connectModelToUser(modelUser, modelFile, 'files')

    return { modelUser }
}

export const connectedModelNameInUser = (connectingModel) => {
    //const lastSymbol = connectingModel.modelName[connectingModel.modelName.length - 1]
    return `_${firstToLower(connectingModel.modelName)}`
}

export const connectModelToUser = (modelUser, connectingModel, memberName = undefined) => {
    const userMemberName = memberName ? memberName : connectedModelNameInUser(connectingModel)
    const connectingModelName = connectingModel.modelName
    const relationName = `_${connectingModelName}OnUser`

    const memberConnectInUser = {
        name: userMemberName,
        type: `[${connectingModelName}]`,
        modelName: connectingModelName,
        isArray: true,
        isRequired: false,
        isUnique: false,
        isVirtual: false,
        isReadonly: false,
        isSystem: true,
        row: -1,
        relation: {
            createFromAnotherModel: false,
            inputName: `${connectingModelName}OnUserPayload`,
            name: relationName,
            relatedModel: connectingModel,
            type: SchemaModelRelationType.RELATION,
            // payloadNameForCreate: 'files',
            // payloadNameForId: 'fileIds',
        } as any,
    }
    modelUser.members.push(memberConnectInUser)

    const memberUserInConnectedModel = {
        name: 'user',
        type: 'User',
        modelName: 'User',
        isArray: false,
        isRequired: false,
        isUnique: false,
        isVirtual: false,
        isReadonly: false,
        isSystem: true,
        row: -1,
        relation: {
            createFromAnotherModel: false,
            inputName: `UserOn${connectingModelName}Payload`,
            name: relationName,
            relatedModel: modelUser,
            relatedMember: memberConnectInUser,
            type: SchemaModelRelationType.RELATION,
            // payloadNameForCreate: 'user',
            payloadNameForId: 'userId',
        } as any,
    }
    connectingModel.members.push(memberUserInConnectedModel)
    memberConnectInUser.relation.relatedMember = memberConnectInUser
}

export const generateDefaultProtection = (): SchemaModelProtection => {
    return {
        all: [
            {
                type: SchemaModelProtectionType.ROLE,
                roles: ['admin'],
                filter: [],
                whitelist: [],
                blacklist: [],
            },
        ],
        one: [
            {
                type: SchemaModelProtectionType.ROLE,
                roles: ['admin'],
                filter: [],
                whitelist: [],
                blacklist: [],
            },
        ],
        create: [
            {
                type: SchemaModelProtectionType.ROLE,
                roles: ['admin'],
                filter: [],
                whitelist: [],
                blacklist: [],
            },
        ],
        update: [
            {
                type: SchemaModelProtectionType.ROLE,
                roles: ['admin'],
                filter: [],
                whitelist: [],
                blacklist: [],
            },
        ],
        remove: [
            {
                type: SchemaModelProtectionType.ROLE,
                roles: ['admin'],
                filter: [],
                whitelist: [],
                blacklist: [],
            },
        ],
    } as SchemaModelProtection
}
