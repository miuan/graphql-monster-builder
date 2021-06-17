import { SchemaModel, SchemaModelProtectionParam, SchemaModelProtectionType, SchemaModelRelationType, SchemaModelType } from '../common/types'

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
        row: -1,
    },
    {
        name: 'verified',
        type: 'Boolean',
        modelName: 'Boolean',
        isArray: false,
        isRequired: false,
        isUnique: false,
        isVirtual:false,
        isReadonly: true,
        relation: null,
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
        row: -1
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
        row: -1,
        relation: {
            createFromAnotherModel: true,
            inputName: 'UserrolesUserRole',
            name: '_RoleOnUser',
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
        row: -1,
        relation: {
            createFromAnotherModel: false,
            inputName: 'UserRoleusersUser',
            name: '_RoleOnUser',
            relatedModel: modelUser,
            relatedMember: memberRolesInUser,
            type: SchemaModelRelationType.RELATION,
            payloadNameForCreate: 'users',
            payloadNameForId: 'usersIds',
        } as any,
    }
    modelUserRole.members.push(memberUsersInUserRole)
    memberRolesInUser.relation.relatedMember = memberUsersInUserRole

    const memberFilesInUser = {
        name: 'files',
        type: '[File]',
        modelName: 'File',
        isArray: true,
        isRequired: false,
        isUnique: false,
        isVirtual: false,
        isReadonly: false,
        row: -1,
        relation: {
            createFromAnotherModel: true,
            inputName: 'FileOnUserPayload',
            name: '_FileOnUser',
            relatedModel: modelFile,
            type: SchemaModelRelationType.RELATION,
            payloadNameForCreate: 'files',
            payloadNameForId: 'fileIds',
        } as any,
    }
    // file relation to User
    modelUser.members.push(memberFilesInUser)
    const memberUserInFile = {
        name: 'user',
        type: 'User',
        modelName: 'User',
        isArray: false,
        isRequired: true,
        isUnique: false,
        isVirtual: false,
        isReadonly: false,
        row: -1,
        relation: {
            createFromAnotherModel: false,
            inputName: 'UserOnFilePayload',
            name: '_FileOnUser',
            relatedModel: modelUser,
            relatedMember: memberFilesInUser,
            type: SchemaModelRelationType.RELATION,
            payloadNameForCreate: 'user',
            payloadNameForId: 'userId',
        } as any,
    }
    modelFile.members.push(memberUserInFile)
    memberFilesInUser.relation.relatedMember = memberUserInFile
}
