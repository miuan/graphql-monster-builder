import {
    SchemaModel,
    SchemaModelProtectionParam,
    SchemaModelProtectionType,
    SchemaModelRelationType,
    SchemaModelType,
} from '../common/types'

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
        isReadonly: true,
        row: -1,
        relation: null,
    },
    {
        name: 'password',
        type: 'String',
        modelName: 'String',
        isArray: false,
        isRequired: true,
        isUnique: false,
        isReadonly: true,
        row: -1,
        relation: null,
        default: '*****',
    },
    {
        name: 'verified',
        type: 'Boolean',
        modelName: 'Boolean',
        isArray: false,
        isRequired: false,
        isUnique: false,
        isReadonly: true,
        row: -1,
        relation: null,
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
            row: -1,
            isReadonly: false,
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
        isUnique: true,
        relation: null,
        isArray: false,
        row: -1,
        isReadonly: false,
    },
    {
        name: 'publicToken',
        modelName: 'String',
        type: 'String',
        isRequired: true,
        isUnique: true,
        relation: null,
        isArray: false,
        row: -1,
        isReadonly: false,
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
        isReadonly: false,
        row: -1,
        relation: {
            createFromAnotherModel: true,
            inputName: 'UserrolesUserRole',
            name: '_RoleOnUser',
            relatedModel: modelUserRole,
            type: SchemaModelRelationType.MANY_TO_MANY,
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
        isReadonly: false,
        row: -1,
        relation: {
            createFromAnotherModel: false,
            inputName: 'UserRoleusersUser',
            name: '_RoleOnUser',
            relatedModel: modelUser,
            relatedMember: memberRolesInUser,
            type: SchemaModelRelationType.MANY_TO_MANY,
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
        isReadonly: false,
        row: -1,
        relation: {
            createFromAnotherModel: true,
            inputName: 'FileOnUserPayload',
            name: '_FileOnUser',
            relatedModel: modelFile,
            type: SchemaModelRelationType.MANY_TO_ONE,
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
        isReadonly: false,
        row: -1,
        relation: {
            createFromAnotherModel: false,
            inputName: 'UserOnFilePayload',
            name: '_FileOnUser',
            relatedModel: modelUser,
            relatedMember: memberFilesInUser,
            type: SchemaModelRelationType.ONE_TO_MANY,
            payloadNameForCreate: 'user',
            payloadNameForId: 'userId',
        } as any,
    }
    modelFile.members.push(memberUserInFile)
    memberFilesInUser.relation.relatedMember = memberUserInFile

    for (const model of models) {
        model.members.push({
            name: 'id',
            type: 'ID',
            modelName: 'ID',
            isArray: false,
            isRequired: true,
            isUnique: true,
            isReadonly: true,
            row: -1,
            relation: null,
        })
    }
}
