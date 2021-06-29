import { ifError } from 'assert'
import { schemaMutations, notMutationFields, schemaFilterStringValue, schemaFilterNumberValue } from '../../common/constatns'

import { StructureBackend, SchemaModel, SchemaModelRelationType, SchemaModelMember, SchemaModelType, MODELS_NOT_HAVE_CREATE } from '../../common/types'
import { firstToLower, firstToUpper, getOnlyOneRelatedMember } from '../../common/utils'
import logger from '../../log'
import { BackendDirectory } from '../backendDirectory'
const log = logger.getLogger('schema')

let applayedRelations = []

export const generateSchemaQueries = (models: SchemaModel[]) => {
    let result = ``

    for (const model of models) {
        if (model.type == SchemaModelType.MODEL) {
            const name = model.modelName
            // tslint:disable-next-line:max-line-length
            result += `  all${name}(filter: ${name}Filter): [${name}Model!]!
            ${name}(id: ID): ${name}Model\n
            `
        }
    }

    return `type Query {
        ${result}
    }`
}

export const cleanApplayedRelations = () => {
    applayedRelations = []
}

export const generateMutationAddingsAndRemovings = (model: SchemaModel) => {
    let result = ''
    for (const member of model.members) {
        if (member.relation?.linkNames) {
            const linkNames = member.relation.linkNames
            const params = linkNames.param3 ? `${linkNames.param1}: ID!, ${linkNames.param2}: ID, ${linkNames.param3}: String` : `${linkNames.param1}: ID!, ${linkNames.param2}: ID!`

            result += `${linkNames.linkName}(${params}): ${firstToUpper(linkNames.linkName)}Result\n`
            result += `${linkNames.unlinkName}(${params}): ${firstToUpper(linkNames.linkName)}Result\n`
            applayedRelations.push(linkNames.relationName)
        }
    }

    return result
}

export const genereateSchemaModelPayloads = (model: SchemaModel) => {
    let result = ''

    for (const member of model.members.filter((member) => member.relation?.linkNames)) {
        const relation = member.relation
        const linkNames = relation.linkNames
        const relatedMember = relation.relatedMember

        const bodyMember1 = '' //`${linkNames.res1}: ${relatedMember.modelName}Model`
        const bodyMember2 = '' //`${linkNames.res2}: ${member.modelName}Model`

        result += `# on model ${model.modelName} - ${member.name}\n`
        result += `type ${firstToUpper(linkNames.linkName)}Result {
  ${linkNames.param1}: ID!
  ${linkNames.param2}: ID!
  ${bodyMember1}
  ${bodyMember2}
}\n
`
    }

    return result
}

// export const findRelatedMemberInRelatedModel = (relation: SchemaModelRelation) => {
//   const relationName = relation.name;
// relation.relatedModel.members.some(mirm => mirm.relation && mirm.relation.name === relationName);

//   for (const memberInRelationModel of relation.relatedModel.members) {

//   }
// };

export const generateSchemaMutations = (models: SchemaModel[]) => {
    let result = `type Mutation {\n`

    applayedRelations = []
    for (const model of models) {
        if (model.type === SchemaModelType.MODEL) {
            for (const mutation of schemaMutations) {
                const name = model.modelName
                const mutationName = mutation[0]
                const mutationParams = mutation[1]

                if (mutationName == 'create' && MODELS_NOT_HAVE_CREATE.includes(name)) continue

                if (mutationParams === 'ONLY_ID') {
                    result += `  ${mutationName}${name}(id: ID!): ${name}Model\n`
                } else {
                    const params = generateInputParamsForMutationModel(model, {
                        includeId: mutationParams === 'ALWAYS_ID',
                        ignoreRequired: mutationName === 'update',
                    })
                    result += `  ${mutationName}${name}(${params}): ${name}Model\n`
                }
            }
            result += generateMutationAddingsAndRemovings(model)
        }
    }

    result += `   login_v1(email: String!, password: String!): UserToken\n`
    result += `   register_v1(email: String!, password: String!): UserToken\n`
    result += `   logout_v1(userId: ID!): LogoutStatus\n`
    result += `   refreshToken_v1(userId: ID!, token: String!, refreshToken: String!): UserToken\n`
    result += `   changePassword_v1(userId: ID!, oldPassword: String!, newPassword: String!): UserToken\n`
    result += `   forgottenPassword_v1(email: String!): ForgottenPasswordStatus\n`
    result += `   forgottenPasswordCheck_v1(token: String!): ForgottenPasswordCheckStatus\n`
    result += `   forgottenPasswordReset_v1(token: String!, password: String!): UserToken\n`
    result += `   verifyEmail_v1(verifyToken: String!): VerifiedUserToken\n`
    result += `   verifyEmailResend_v1(userId: ID!): VerifyEmailResendStatus\n`

    result += '}\n\n'

    return result
}

export const generateInputParamsForMutationModel = (model: SchemaModel, options: any = null) => {
    let result = ''
    const nmf = [...notMutationFields['']]

    const includeId = options && options.includeId
    const excludeRelationToModel = options && options.excludeRelationToModel
    const ignoreRequired = options?.ignoreRequired

    if (notMutationFields[model.modelName] && notMutationFields[model.modelName].length > 0) {
        nmf.push(...notMutationFields[model.modelName])
    }

    if (includeId) {
        result += `, id: ID!`
    }

    for (const member of model.members) {
        const name = member.name
        if (nmf.indexOf(name) === -1 && !member.isReadonly) {
            if (member.relation) {
                if (excludeRelationToModel === member.modelName) {
                    // this relation is excluded
                    // please don't consider to do any action
                    continue
                }

                if (member.relation.payloadNameForId) {
                    result += `, ${constructMemberWithType(member.relation.payloadNameForId, 'ID', member.isArray)}`
                }

                if (member.relation.createFromAnotherModel) {
                    result += `, ${constructMemberWithType(member.relation.payloadNameForCreate, member.relation.inputName, member.isArray)}`
                }
            } else {
                // 1. required member have to be present for creation
                // 2. ignoreRequired if you generate mutation for update,
                //    we expect the already created object have all required fields
                //    so we need push user to include them all time he need update it
                // 3. if member have default value, it is included in mongoose model schema
                //    and is not necessary to push user to include it even for creation
                result += `, ${constructMemberWithType(name, member.type, member.isArray, member.isRequired && !ignoreRequired && !member.default)}`
            }
        }
    }
    return result.substr(2)
}

export function constructMemberWithType(name: string, baseType: string, isArray: boolean, isRequire = false, haveArrayRequiredItem = false) {
    let type
    if (isArray && haveArrayRequiredItem) {
        type = `[${baseType}!]`
    } else if (isArray) {
        type = `[${baseType}]`
    } else {
        type = baseType
    }

    if (isRequire) {
        type += '!'
    }

    return `${name}: ${type}`
}

export const generateSchemaOrder = (model: SchemaModel, notVirtualMembers: SchemaModelMember[]) => {
    let result = `enum ${model.modelName}OrderBy {\n`

    for (const member of notVirtualMembers) {
        result += `  ${member.name}_ASC\n`
        result += `  ${member.name}_DESC\n`
    }

    result += '}\n\n'

    return result
}

export const generateSchameFilter = (model: SchemaModel, notVirtualMembers: SchemaModelMember[]) => {
    const filterName = `${model.modelName}Filter`
    let result = `input ${filterName} {\n
  AND: [${filterName}!]
  OR: [${filterName}!]
  `

    for (const member of notVirtualMembers) {
        // in case the member is related to another member
        if (member.relation) {
            result += `  ${member.name}_every: ${member.relation.relatedModel.modelName}Filter\n`
            result += `  ${member.name}_some: ${member.relation.relatedModel.modelName}Filter\n`
            result += `  ${member.name}_none: ${member.relation.relatedModel.modelName}Filter\n\n`

            continue
        }

        result += `  ${member.name}: ${member.type}\n`
        const variants = member.type === 'String' ? schemaFilterStringValue : schemaFilterNumberValue

        for (const v of variants) {
            const variable = v.length && v.length > 0 ? v[0] : v
            const comment = v.length && v.length > 1 ? v[1] : ''
            const special = v.length && v.length > 2 ? v[2] : false

            if (comment) {
                result += `  # ${comment}\n`
            }

            if (!special) {
                result += `  ${member.name}_${variable}: ${member.type}\n\n`
            } else {
                result += `  ${member.name}_${variable}: [${member.type}!]\n\n`
            }
        }
    }

    result += '}\n\n'

    return result
}

export const generateSchemaModel = (model: SchemaModel) => {
    let result = ``

    for (const member of model.members) {
        let constructedMember
        if (member.relation) {
            constructedMember = constructMemberWithType(member.name, `${member.relation.relatedModel.modelName}Model`, member.isArray, member.isRequired, true)
        } else {
            constructedMember = constructMemberWithType(member.name, member.type, member.isArray, member.isRequired)
        }

        result += `\n    ${constructedMember}`
    }

    return `
  type ${model.modelName}Model {
${result.substr(1)}
  }

  type ${model.modelName}ModelRemove {
    id: ID!
  }
`
}

export const generateSchemaInputs = (models: SchemaModel[]) => {
    let result = ``

    for (const model of models) {
        for (const member of model.members) {
            if (member.relation && member.relation.createFromAnotherModel) {
                result += generateSchemaInputsForModel(model.modelName, member.relation.relatedModel, member.relation.inputName)
            }
        }
    }

    result += '\n'
    return result
}

export const generateSchemaInputsForModel = (modelName: string, relatedModel: SchemaModel, inputName: string) => {
    let result = `input ${inputName} {\n`

    result += generateInputParamsForMutationModel(relatedModel, {
        includeID: false,
        excludeRelationToModel: modelName,
    })

    result += '\n}\n'

    return result
}

export const generateSchemaAsString = (models: SchemaModel[]): string => {
    let orders = ''
    let filters = ''
    let generatedModels = ''
    let queriesAndMutations = ''

    for (const model of models) {
        const notVirtualMembers = model.members.filter((member) => !member.isVirtual)
        orders += generateSchemaOrder(model, notVirtualMembers)
        filters += generateSchameFilter(model, notVirtualMembers)
        generatedModels += generateSchemaModel(model)
        queriesAndMutations += genereateSchemaModelPayloads(model)
    }

    queriesAndMutations += generateSchemaQueries(models)
    queriesAndMutations += generateSchemaInputs(models)
    queriesAndMutations += generateSchemaMutations(models)

    return `
  ${orders}

  ${filters}

  ${generatedModels}

  type UserToken {
    token: String!
    refreshToken: String!
    user: UserModel!
  }

  type VerifiedUserToken {
    token: String
    refreshToken: String
    user: UserModel!
  }

  type VerifyEmailResendStatus {
    email: String!
    status: String!
  }

  type ForgottenPasswordStatus {
    email: String!
    status: String!
  }

  type ForgottenPasswordCheckStatus {
    token: String!
    status: String!
  }

  type LogoutStatus {
    status: String!
  }

  ${queriesAndMutations}

  # An object with an ID
  interface Node {
    # The id of the object.
    id: ID!
  }
  
  scalar DateTime
    `
}

export const generateSchema = async (backendDirectory: BackendDirectory, models: SchemaModel[]) => {
    log.trace('generateSchema', models)
    const body = generateSchemaAsString(models)
    backendDirectory.genWrite(`graphql.schema`, body)
}
