import { templateFileToText } from '../../common/files'
import { SchemaModel, SchemaModelRelationType, StructureBackend, SchemaModelMember, SchemaModelType } from '../../common/types'
import { firstToLower } from '../../common/utils'

const defaultMembers = ['createdAt', 'updatedAt', 'id']

import logger from '../../log'
import { BackendDirectory } from '../backendDirectory'
const log = logger.getLogger('model')

export const createMongoModel = (structure: StructureBackend, model: SchemaModel, notVirtualMembers: SchemaModelMember[]) => {
    const modelName = model.modelName
    const lower = firstToLower(modelName)
    const schemaName = `${lower}Schema`

    let constructedMembers = ''
    let constructedIndexiesAndValidators = ''
    const forConstructingImports = []

    for (const member of notVirtualMembers) {
        if (!defaultMembers.includes(member.name)) {
            constructedMembers += `\t\t${member.name}: ${constructMember(member, structure)},\n`
        }

        if (member.isUnique && Array.isArray(member.isUnique)) {
            constructedIndexiesAndValidators += `${schemaName}.index({ ${member.name}: 1`
            for (const c of member.isUnique as string[]) {
                constructedIndexiesAndValidators += `,${c}: 1`
            }
            constructedIndexiesAndValidators += `}, { unique: true });`
        }

        if (member.regExp) {
            const escapedRegExp = member.regExp.replace(/\//g, '\\/')
            constructedIndexiesAndValidators += `${schemaName}.path('${member.name}').validate((${member.name}) => /${escapedRegExp}/.test(${member.name}), 'The ${member.name} is it in wrong format. RegExp(/${escapedRegExp}/')`
        }

        if (member.relation && member.relation.type === SchemaModelRelationType.ENTITY && !forConstructingImports.includes(member.modelName)) {
            forConstructingImports.push(member.modelName)
        }
    }

    if (modelName === 'User') {
        constructedMembers += `__token: { type: Schema.Types.String, required: false},\n`
        constructedMembers += `__refreshToken: { type: Schema.Types.String, required: false},\n`
        constructedMembers += `__verifyToken: { type: Schema.Types.String, required: false},\n`
        constructedMembers += `__password: { type: Schema.Types.String, required: true},\n`
        constructedMembers += `__resetPasswordToken: { type: Schema.Types.String},\n`
        constructedMembers += `__parent_access_token: { type: Schema.Types.String},\n`

        // https://docs.mongodb.com/manual/core/index-partial/#examples
        constructedIndexiesAndValidators += `
  ${schemaName}.index(
    { __resetPasswordToken: 1 },
    { unique: true, partialFilterExpression: { __resetPasswordToken: { $exists: true } } }
  )
  ${schemaName}.index(
    { __verifyToken: 1 },
    { unique: true, partialFilterExpression: { __verifyToken: { $exists: true } } }
  )
  ${schemaName}.path('email').validate((email) => /^([\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4})?$/.test(email), 'The e-mail is not in correct format.')
`
    }

    if (modelName === 'File') {
        constructedMembers += `__path: { type: Schema.Types.String, required: true, index: true},\n`
    }

    let modelExport = ''
    if (model.type === SchemaModelType.MODEL) {
        modelExport = `
        export const ${lower}Model: Model<${modelName}Model> = model<${modelName}Model>(
            '${structure.id}_${modelName}', ${schemaName}
        );`
    }

    const constructedImports = forConstructingImports.reduce((acc, cur) => {
        acc += `import { ${firstToLower(cur)}Schema } from './${cur}'`
        return acc
    }, '')

    return templateFileToText('model.t.ts', {
        __MODEL_NAME__: modelName,
        __SCHEMA_NAME__: schemaName,
        __CONSTRUCTED_MEMBERS__: constructedMembers,
        __CONSTRUCTED_INDEXIES__: constructedIndexiesAndValidators,
        __CONSTRUCTED_IMPORTS__: constructedImports,
        __EXPORT_MODEL__: modelExport,
    })
}

export const transformTypeToMongoType = (structure: StructureBackend, member: SchemaModelMember) => {
    if (member.relation) {
        return member.relation.type === SchemaModelRelationType.RELATION ? 'Schema.Types.ObjectId' : `${firstToLower(member.type)}Schema`
    }

    if (member.modelName === 'DateTime') {
        return 'Schema.Types.Date'
    } else if (member.modelName === 'Int' || member.modelName === 'Float') {
        return `Schema.Types.Number`
    } else {
        return `Schema.Types.${member.modelName}`
    }
}

export const generateMongoModelToFile = (backendDirectory: BackendDirectory, model: SchemaModel, notVirtualMembers: SchemaModelMember[]) => {
    const str = createMongoModel(backendDirectory.structure, model, notVirtualMembers)

    backendDirectory.modelsWrite(`${model.modelName}`, str)
}

// export const generateModels = (backendDirectory: BackendDirectory, models: SchemaModel[]) => {
//     log.trace('generateModels')
//     for (const model of models) {
//         log.info(`Generate model: ${model.modelName}`)
//         generateMongoModelToFile(backendDirectory, model)
//     }
// }

function constructMember(member: SchemaModelMember, structure: StructureBackend) {
    let constructedMember = `type: ` + (member.isArray ? `[${transformTypeToMongoType(structure, member)}]` : transformTypeToMongoType(structure, member))

    if (member.relation && member.relation.type == SchemaModelRelationType.RELATION) {
        constructedMember += `, ref: '${structure.id}_${member.relation.relatedModel.modelName}', index: true`
    }

    if (member.isRequired) {
        constructedMember += `, required: true`
    }

    if (member.isUnique === true) {
        constructedMember += `, unique: true`
    }

    if (member.default) {
        constructedMember += `, default: '${member.default}'`
    }
    return `{${constructedMember}}`
}
