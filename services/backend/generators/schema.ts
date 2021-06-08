import {
    schemaMutations,
    notMutationFields,
    schemaFilterStringValue,
    schemaFilterNumberValue,
} from '../../common/constatns'

import {
    StructureBackend,
    SchemaModel,
    SchemaModelRelationType,
    SchemaModelMember,
    SchemaModelType,
} from '../../common/types'
import { getOnlyOneRelatedMember } from '../../common/utils'
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
            result += `  all${name}(filter: ${name}Filter): [${name}Model!]!\n
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
export const relatedParamName1 = (model: SchemaModel, relatedMember: SchemaModelMember) =>
    `${relatedMember.name}${model.modelName}`
export const relatedParamName2 = (member: SchemaModelMember) =>
    `${member.name}${member.relation.relatedModel.modelName}`
export const relatedParamName1Id = (model: SchemaModel, relatedMember: SchemaModelMember) =>
    `${relatedParamName1(model, relatedMember)}Id`
export const relatedParamName2Id = (member: SchemaModelMember) => `${relatedParamName2(member)}Id`

export const generateMutationAddingsAndRemovings = (model: SchemaModel) => {
    let result = ''
    for (const member of model.members) {
        if (!member.relation) {
            continue
        } else if (member.relation.relatedMember.isArray) {
            const relation = member.relation
            const relationName = relation.name

            const relatedMember = getOnlyOneRelatedMember(member)
            if (!relatedMember) {
                continue
            }

            log.debug('winner is:', model.modelName)

            const relatedModel = relation.relatedModel
            // const relatedMember = relatedModel.members.find(m => m.relation && m.relation.name === relationName);

            const params = `${relatedParamName1Id(model, relatedMember)}: ID!, ${relatedParamName2Id(member)}: ID!`

            result += `addTo${relationName}(${params}): AddTo${relation.payloadNameForAddOrDelete}\n`
            result += `removeFrom${relationName}(${params}): RemoveFrom${relation.payloadNameForAddOrDelete}\n`
            applayedRelations.push(relationName)
        }
    }

    return result
}

export const genereateSchemaPayloads = (models: SchemaModel[]) => {
    let result = ''

    for (const model of models) {
        result += genereateSchemaModelPayloads(model)
    }
    // result += genereateSchemaModelPayloads(models[3]);
    // result += genereateSchemaModelPayloads(models[4]);

    return result
}

export const genereateSchemaModelPayloads = (model: SchemaModel) => {
    let result = ''

    for (const member of model.members) {
        const relation = member.relation
        if (relation && !relation.payloadNameForAddOrDelete) {
            const relationName = relation.name
            const payloadName = `${relationName}Payload`
            const relatedMember = relation.relatedMember

            const bodyMember1 = `${relatedParamName1(model, relatedMember)}: ${relatedMember.modelName}Model`
            const bodyMember2 = `${relatedParamName2(member)}: ${member.modelName}Model`

            relation.payloadNameForAddOrDelete = payloadName
            relatedMember.relation.payloadNameForAddOrDelete = payloadName

            result += `# on model ${model.modelName} - ${member.name}\n`
            result += `type AddTo${payloadName} {
  ${bodyMember1}
  ${bodyMember2}
}\n
`

            result += `type RemoveFrom${payloadName} {
  ${bodyMember1}
  ${bodyMember2}
}
`
        }
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
        if (model.type === SchemaModelType.MODEL)
            for (const mutation of schemaMutations) {
                const name = model.modelName
                const mutationName = mutation[0]
                const mutationParams = mutation[1]

                if (name == 'User' && mutationName == 'create') continue

                if (mutationParams === 'ONLY_ID') {
                    result += `  ${mutationName}${name}(id: ID!): ${name}Model\n`
                } else {
                    const params = generateInputParamsForMutationModel(model, {
                        includeId: mutationParams === 'ALWAYS_ID',
                        forceRequiredFields: mutationName === 'create',
                    })
                    result += `  ${mutationName}${name}(${params}): ${name}Model\n`
                }
            }
        result += generateMutationAddingsAndRemovings(model)
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
    const forceRequiredFields = options && options.forceRequiredFields

    if (notMutationFields[model.modelName] && notMutationFields[model.modelName].length > 0) {
        nmf.push(...notMutationFields[model.modelName])
    }

    if (includeId) {
        result += `, id: ID!`
    }

    for (const member of model.members) {
        const mame = member.name
        if (nmf.indexOf(mame) === -1 && !member.isReadonly) {
            if (member.relation) {
                if (excludeRelationToModel === member.modelName) {
                    // this relation is excluded
                    // please don't consider to do any action
                    continue
                }

                const relatedModel = member.relation.inputName
                const createFromAnotherModel = member.relation.createFromAnotherModel

                let relationText = ''

                if (member.isArray) {
                    relationText += `, ${member.relation.payloadNameForId}: [ID!]`
                    if (createFromAnotherModel)
                        relationText += `, ${member.relation.payloadNameForCreate}: [${relatedModel}!]`
                } else {
                    relationText += `, ${member.relation.payloadNameForId}: ID`
                    if (createFromAnotherModel)
                        relationText += `, ${member.relation.payloadNameForCreate}: ${relatedModel}`
                }

                result += relationText
            } else {
                result += `, ${mame}: ${member.type}`

                if (forceRequiredFields && member.isRequired) {
                    result += `!`
                }
            }
        }
    }
    return result.substr(2)
}

export const generateSchemaOrder = (model: SchemaModel) => {
    let result = `enum ${model.modelName}OrderBy {\n`

    for (const member of model.members) {
        result += `  ${member.name}_ASC\n`
        result += `  ${member.name}_DESC\n`
    }

    result += '}\n\n'

    return result
}

export const generateSchameFilter = (model: SchemaModel) => {
    const filterName = `${model.modelName}Filter`
    let result = `input ${filterName} {\n
  AND: [${filterName}!]
  OR: [${filterName}!]
  `

    for (const member of model.members) {
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
        let type = ''
        if (member.relation) {
            type = `${member.relation.relatedModel.modelName}Model`
            if (member.isArray) type = `[${type}!]`
        } else {
            type = member.type
        }

        if (member.isRequired) {
            type += '!'
        }

        result += `\n    ${member.name}: ${type}`
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
                result += generateSchemaInputsForModel(
                    model.modelName,
                    member.relation.relatedModel,
                    member.relation.inputName,
                )
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
        forceRequiredFields: true,
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
        orders += generateSchemaOrder(model)
    }

    for (const model of models) {
        filters += generateSchameFilter(model)
    }

    for (const model of models) {
        generatedModels += generateSchemaModel(model)
    }

    queriesAndMutations += generateSchemaQueries(models)
    queriesAndMutations += generateSchemaInputs(models)
    queriesAndMutations += genereateSchemaPayloads(models)
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
