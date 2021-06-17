import {
    SchemaModel,
    SchemaModelRelationType,
    SchemaModelMember,
    SchemaModelRelation,
    SchemaModelProtection,
    SchemaModelProtectionType,
    SchemaModelProtectionParam,
    SchemaModelType,
    MODEL_TYPES,
} from '../common/types'
import { MONGOSEE_RESERVED_WORDS } from '../common/constatns'
import { extractMemberFromLineParams } from './members'
import { setupModelsRelations } from './relations'
import { addDefaultModelsAndMembers } from './defaultModels'

export const getModelsFromSchema = (schema): SchemaModel[] => {
    const rows = schema.split('\n').map((r) => r.trim())

    let currentModel: SchemaModel = null
    let currentProtection: SchemaModelProtection = generateBaseProtection()
    const models: SchemaModel[] = [] as SchemaModel[]

    const modelRegExp = new RegExp('(type|model|entity) (w+) ?(@model|@entity)? ?{')
    let lineNumber = 1
    for (const currentRow of rows) {
        const matched = currentRow.match(/ *(\w+) *(\w+) *(@((\w+)))? *{/)
        if (currentRow.indexOf('#') === 0) {
            // ** COMMENTS
        } else if (matched && matched.length > 1) {
            // ** START WITH LOADING MEMBER TO MODEL **
            const modelType = matched[5] || matched[1]
            const modelName = matched[2]

            if (!/^[A-Z]/.test(modelName)) {
                throw `Line ${lineNumber}: The model name '${modelName}' should start with capital leter '[A-Z]'`
            }

            if (!MODEL_TYPES.includes(modelType)) {
                throw `Line ${lineNumber}: The type '${modelType}' of '${modelName}' is unknown, knows types are ${MODEL_TYPES}`
            }

            if (modelType === 'type') {
                throw `Line ${lineNumber}: The type of '${modelName}' is not specified, it shoudl be followed with @ after model name`
            }

            currentModel = {
                modelName,
                start: lineNumber,
                end: lineNumber,
                members: [],
                type: modelType === 'model' ? SchemaModelType.MODEL : SchemaModelType.ENTITY,
            } as SchemaModel
        } else if (currentModel && currentRow === '}') {
            // ** CLOSE LOADING MEMBERS TO MODEL **
            currentModel.end = lineNumber
            models.push(currentModel)
            currentModel.protection = currentProtection
            currentProtection = generateBaseProtection()
            currentModel = null
        } else if (currentModel && currentRow) {
            // ** ADD MEMBERS TO CURRENT MODEL **
            const member = extractMemberFromLine(currentRow, lineNumber)
            // maybe is empty line check it
            if (member) {
                currentModel.members.push(member)
            }
        } else if (!currentModel && currentRow) {
            scanProtectionLine(currentRow, currentProtection, lineNumber)
        }

        lineNumber++
    }

    setupModelsRelations(models)
    checkForErrorsInModels(models)
    addDefaultModelsAndMembers(models)

    const modelsWithOnlyRelations = models.filter((model)=>model.members.every((member) => member.relation?.type === SchemaModelRelationType.RELATION))
    // in generate create and update method is not counting there is anything to create or updated
    if (modelsWithOnlyRelations?.length) {
        throw new Error(
            modelsWithOnlyRelations
                .reduce((a, c) => {
                    a += `\nLine ${c.start}: Model with name '${c.modelName}' has only relations but any scalar type`
                    return a
                }, '')
                .substr(1),
        )
    }

    models
        .filter((model) => model.type === SchemaModelType.MODEL)
        .forEach((model) => {
            model.members.unshift({
                name: 'id',
                type: 'ID',
                modelName: 'ID',
                isArray: false,
                isRequired: true,
                isUnique: true,
                isVirtual: false,
                isReadonly: true,
                relation: null,
                row: -1,
            } as SchemaModelMember)
    })

    return models
}

export const checkForErrorsInModels = (models: SchemaModel[]) => {
    const reservedInUser = ['email', 'password', 'verified', 'roles', 'files']
    const reservedInFile = ['name', 'publicToken', 'user', 'size', 'type', 'data']
    const modelsList = []

    for (const model of models) {
        const memberList = []

        if (modelsList.includes(model.modelName)) {
            const previous = models.find((m) => m.modelName == model.modelName)

            throw new Error(`Line ${model.start}: Model name '${model.modelName}' is already use in Line ${previous.start}. Inside schema have to be every model named uniquely`)
        }

        if (model.modelName == 'UserRole') throw `Line ${model.start}: Model with name '${model.modelName}' have reserved name and will be add automaticaly`

        for (const member of model.members) {
            if (model.modelName == 'User' && reservedInUser.indexOf(member.name) != -1)
                throw `Line: ${model.start} Model: ${model.modelName} are these fields names ${reservedInUser} reserved and will be add automaticaly`
            else if (model.modelName == 'File' && reservedInFile.indexOf(member.name) != -1)
                throw `Line: ${model.start} Model: ${model.modelName} are these fields names ${reservedInFile} reserved and will be add automaticaly`
            else if (member.name == 'id') throw `Line ${member.row}: Model with name '${model.modelName}' have member with name \`id\` that is reserved and will be add automaticaly`

            if (memberList.includes(member.name)) {
                const previous = model.members.find((m) => m.name == member.name)

                throw new Error(
                    `Line ${member.row}: In model with name '${model.modelName}' is duplicate field name: '${member.name}' previously used also on Line: ${previous.row}. Inside model have to be every field named uniquely`,
                )
            }

            if(model.type === SchemaModelType.ENTITY && member.relation && member.relation.type === SchemaModelRelationType.RELATION){
                throw new Error(
                    `Line ${member.row}: Entity with name '${model.modelName}' have a full relation '${member.relation.name}' what is not possible`,
                )
            }

            memberList.push(member.name)
        }

        modelsList.push(model.modelName)
    }
}

export const scanProtectionLine = (line: string, protection: SchemaModelProtection, row: number) => {
    const units = line.split(' ')

    for (const unit of units) {
        scanProtectionUnit(unit, protection, row)
    }
}

export const scanProtectionUnit = (unit: string, protection: SchemaModelProtection, row: number) => {
    const regexp = new RegExp('@[a-z]*\\(')
    const matched = unit.match(regexp)

    if (!matched || matched.length !== 1) {
        return
    }

    const protectRaw = matched[0]
    // remove first '@' and on end '('
    const protectFor = protectRaw.substr(1, protectRaw.length - 2)
    const paramsRaw = unit.split(protectRaw)[1]
    // remove first '"' and on end '"'
    const params = paramsRaw.substr(0, paramsRaw.length - 1).split(',')

    if (params.length < 1 || params[0].length < 1) {
        // tslint:disable-next-line:max-line-length
        throw `Line ${row}: Protection '${unit}' have empty type, basic supported types are 'public','user','owner','role'`
    }

    let mainParams
    let typeString = ''
    const param: SchemaModelProtectionParam = {
        type: SchemaModelProtectionType.PUBLIC,
        typeName: typeString,
        roles: [],
        filter: [],
        whitelist: [],
        blacklist: [],
    } as SchemaModelProtectionParam

    for (const p of params) {
        mainParams = p.split(':')
        // tslint:disable-next-line:max-line-length
        typeString = cleanParameter(mainParams[0])
        const value = mainParams.length > 1 ? cleanParameter(mainParams[1]) : null

        protectionCheckTheParameter(param, typeString, value, unit, row)
    }

    if (protectFor === 'all') {
        protection.all.push(param)
    } else if (protectFor === 'one') {
        protection.one.push(param)
    } else if (protectFor === 'create') {
        protection.create.push(param)
    } else if (protectFor === 'update') {
        protection.update.push(param)
    } else if (protectFor === 'remove') {
        protection.remove.push(param)
    }
}

export const protectionCheckTheParameter = (param: SchemaModelProtectionParam, typeName: string, value: string, unit: string, row: number) => {
    if (typeName === 'public') {
        updateType(param, typeName, SchemaModelProtectionType.PUBLIC)
    } else if (typeName === 'user') {
        updateType(param, typeName, SchemaModelProtectionType.USER)
    } else if (typeName === 'owner') {
        updateType(param, typeName, SchemaModelProtectionType.OWNER)
        param.param = value
    } else if (typeName === 'role') {
        updateType(param, typeName, SchemaModelProtectionType.ROLE)
        param.roles.push(value)
    } else if (typeName === 'filter') {
        updateType(param, typeName, SchemaModelProtectionType.FILTER)
        const stl = value.split('=')
        param.filter.push({
            name: cleanParameter(stl[0]),
            value: cleanParameter(stl[1]),
        })
    } else {
        // tslint:disable-next-line:max-line-length
        throw `Line ${row}: Protection '${unit}' have unknow parameter name '${typeName}' supported types are 'public','user','owner','role', 'filter'`
    }
}

export const cleanParameter = (param: string): string => {
    let cleaned = param

    if (cleaned[0] === '"') {
        cleaned = cleaned.substr(1)
    }

    if (cleaned[cleaned.length - 1] === '"') {
        cleaned = cleaned.substr(0, cleaned.length - 1)
    }

    return cleaned
}

export const updateType = (param: SchemaModelProtectionParam, typeName: string, type: SchemaModelProtectionType) => {
    // the FILTER is type what should not be overrieded
    // in case is two or more params like filter or role
    // filter should be know as
    if (param.type === SchemaModelProtectionType.FILTER) {
        return
    }

    param.type = type
    param.typeName = typeName
}

export const generateBaseProtection = (): SchemaModelProtection => {
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

export const extractMemberFromLine = (row: string, lineNumber: number): SchemaModelMember => {
    const match = row.match(/ *(\w+) *: *((@(\w+) *\(((\w+) *[:|=])? *"(\w+)" *\)|\w+)) *(\[\])? *(\!)?(.*\w+\(*\)*\'*\"*)?/)

    if (!match) {
        throw new Error(`Line ${lineNumber}: The member '${row}' is not in good shape. Should be something like 'memberName: String`)
    }

    const {
        1: name,
        3: type,
        4: relationType, // 'relation' or 'connect'
        5: relationParamName, // 'name' or 'entity'
        7: relationParamValue,
        8: isArray,
        9: isRequired,
        10: options,
    } = match
    // empty line we can skip
    if (match.length < 2) {
        return null
    }

    // https://mongoosejs.com/docs/api.html#schema_Schema.reserved
    if (MONGOSEE_RESERVED_WORDS.indexOf(name) !== -1) {
        throw `Line ${lineNumber}: The member name '${name}' is reserved, reserved words: ${MONGOSEE_RESERVED_WORDS}`
    }

    if (!/^[_A-Za-z]/.test(name)) {
        throw `Line ${lineNumber}: The member name '${name}' should start with regular character '[A-Za-z]'`
    }

    const member: SchemaModelMember = {
        row: lineNumber,
        name,
        type,
        isArray: !!isArray,
        isRequired: !!isRequired,
        isUnique: false,
        isVirtual: false
    } as SchemaModelMember

    if (relationType) {
        if (relationType !== 'relation' && relationType !== 'connect') {
            throw `Line ${lineNumber}: The member name '${name}' have unknown relation type '${relationType}, known types are 'relation' and 'connect'`
        }

        member.relation = {
            name: relationParamValue,
            type: relationType === 'relation' ? SchemaModelRelationType.RELATION : SchemaModelRelationType.CONNECT,
        } as SchemaModelRelation

        // the actual model name will setup from related model
        // in method relations.ts/setupModelsRelations
        member.modelName = null
    } else if (!['ID', 'Boolean', 'String', 'Int', 'Float', 'DateTime'].includes(type)) {
        member.relation = {
            name: `_${type}_ENTITY`,
            type: SchemaModelRelationType.ENTITY,
        } as SchemaModelRelation
        member.modelName = type
    } else {
        member.modelName = type
    }

    if (options) {
        const splited = options.split('@')
        splited.shift()
        for (const param of splited) {
            extractMemberFromLineParams(member, `@${param.trim()}`)
        }
    }

    // if (!member.relation && !['ID', 'Boolean', 'String', 'Int', 'Float', 'DateTime'].includes(member.modelName)) {
    //     throw new Error(`Line ${lineNumber}: Unknown type ${member.modelName}`)
    // }

    return member
}
