import { StructureBackend, SchemaModel, SchemaModelRelationType, SchemaModelType, MODELS_NOT_HAVE_CREATE } from '../../common/types'
import { writeToFile, templateToText, templateFileToText } from '../../common/files'
import { getOnlyOneRelatedMember, firstToLower, firstToUpper } from '../../common/utils'
import { BackendDirectory } from '../backendDirectory'
import { model } from 'mongoose'

export const generateEntry = async (backendDirectory: BackendDirectory, models: SchemaModel[]) => {
    const body = generateEntryWorker(backendDirectory.structure, models)
    backendDirectory.genWrite(`entry`, body)
}

export const genAddingAndRemovingsForModel = (model: SchemaModel) => {
    let result = ''
    const membersWithRelations = model.members.filter((model) => model.relation?.type === SchemaModelRelationType.RELATION)
    for (const member of membersWithRelations) {
        const relatedMember = member.relation && getOnlyOneRelatedMember(member)

        if (member.relation?.linkNames) {
            const lower = firstToLower(model.modelName)
            const linkNames = member.relation?.linkNames

            result += `\t\t${linkNames.linkName}: entry.resolvers['${lower}'].${linkNames.linkName},
\t\t${linkNames.unlinkName}: entry.resolvers['${lower}'].${linkNames.unlinkName},
`
        }
    }
    return result
}

export const generateEntryWorker = (structure: StructureBackend, models: SchemaModel[]): string => {
    let body = ''
    let modelsBody = ''
    let services = ''
    let resolvers = ''
    let apiConnectors = ''

    const properModels = models.filter((model) => model.type === SchemaModelType.MODEL)
    for (const model of properModels) {
        const lower = firstToLower(model.modelName)
        const modelName = `${lower}Model`
        body += `import { ${modelName} } from './models/${model.modelName}'\n`
        modelsBody += `entry.models['${lower}'] = ${modelName}\n`

        body += `import { generate${model.modelName}Service } from './services/${model.modelName}'\n`
        services += `entry.services['${lower}'] = generate${model.modelName}Service(entry)\n`

        body += `import { generate${model.modelName}Resolver } from './resolvers/${model.modelName}'\n`
        resolvers += `entry.resolvers['${lower}'] = generate${model.modelName}Resolver(entry)\n`

        body += `import { connect${model.modelName}Api } from './api/${model.modelName}'\n`
        apiConnectors += `connect${model.modelName}Api(apiRouter, entry)\n`
        body += '\n'
    }

    // for (const model of structure.services.modules) {
    //     const lower = model.charAt(0).toLowerCase() + model.slice(1)
    //     const serviceName = `${lower}Service`
    // }
    // body += '\n'

    // for (const model of structure.resolvers.modules) {
    //     const lower = model.charAt(0).toLowerCase() + model.slice(1)
    //     const modelName = `${lower}Service`
    //     body += `import { generate${model}Resolver } from './resolvers/${model}'\n`
    //     resolvers += `entry.resolvers['${lower}'] = generate${model}Resolver(entry)\n`
    // }

    const resolver = createResolvers(structure, models)

    body += templateFileToText('entry.t.ts', {
        _MODELS_BODY_: modelsBody,
        _SERVICES_: services,
        _RE1SOLVERS_: resolvers,
        _RESOLVER_: resolver,
        _API_CONNECTORS_: apiConnectors,
    })

    return body
}

export const createResolvers = (structure: StructureBackend, models: SchemaModel[]) => {
    let queries = ''
    let mutations = ''
    let dataloaders = ''

    for (const model of models) {
        if (model.type === SchemaModelType.MODEL) {
            const modelName = model.modelName
            const lower = firstToLower(modelName)
            queries += `\t\t${modelName}: entry.resolvers['${lower}'].one,\n`
            queries += `\t\tall${modelName}: entry.resolvers['${lower}'].all,\n`
            queries += `\t\tcount${modelName}: entry.resolvers['${lower}'].count,\n`

            if (!MODELS_NOT_HAVE_CREATE.includes(modelName)) mutations += `\t\tcreate${modelName}: entry.resolvers['${lower}'].create,\n`
            mutations += `\t\tupdate${modelName}: entry.resolvers['${lower}'].update,\n`
            mutations += `\t\tremove${modelName}: entry.resolvers['${lower}'].remove,\n`

            mutations += genAddingAndRemovingsForModel(model)
        }

        dataloaders += generateDataloadersForResolver(model)
    }

    const body = `
  {
    Query:{
      ${queries}
    },
    Mutation:{
      ${mutations}
      // generated by entry.ts
      login_v1: extras.generateLogin(entry),
      register_v1: extras.generateRegister(entry),
      logout_v1: extras.generateLogout(entry),
      refreshToken_v1: extras.generateRefreshToken(entry),
      changePassword_v1: extras.generateChangePassword(entry),
      forgottenPassword_v1: extras.generateForgottenPassword(entry),
      forgottenPasswordCheck_v1: extras.generateForgottenPasswordCheck(entry),
      forgottenPasswordReset_v1: extras.generateForgottenPasswordReset(entry),
      verifyEmail_v1: extras.generateVerify(entry),
      verifyEmailResend_v1: extras.generateVerifyEmailResend(entry)
    }
    ${dataloaders}
  }
  `

    return body
}

export const createQueryResolvers = (modules) => {}

export const generateDataloadersForResolver = (model: SchemaModel) => {
    let body = `,${model.modelName}Model: {`
    let linkAndUnlink = ''

    // SchemaModelRelationType.ENTITY is actualy part of object
    // have a dataloader mean it will try to use dataloade but we already have the data
    // NOTE: !m.isSystem - can't be appplied othervise User and UserRole resolvers are not connect
    //       {"errors":[{"message":"Cannot return null for non-nullable field UserRoleModel.name.","locations":[{"line":9,"column":7}],"path":["login_v1","user","roles",0,"name"]

    const memberWithRelation = model.members.filter((m) => m.relation && !m.isHidden && m.relation.type !== SchemaModelRelationType.ENTITY)
    for (const member of memberWithRelation) {
        const memberName = member.name
        const lower = firstToLower(member.relation.relatedModel.modelName)
        const many = member.isArray
        body += `
    ${memberName}: async (${lower}Model, data, koaContext) => {
      return entry.dataloaders['${lower}'](koaContext, ${lower}Model.${memberName},${many})
    },`

        if (member.relation?.linkNames) {
            const linkNames = member.relation?.linkNames
            const meLower = firstToLower(model.modelName)
            const meMany = member.relation.relatedMember.isArray
            linkAndUnlink += `,${firstToUpper(linkNames.linkName)}Result:{
                ${linkNames.res1}: async (${meLower}Model, data, koaContext) => {
                    return  entry.dataloaders['${meLower}'](koaContext, ${meLower}Model.${linkNames.param1},${meMany})
                  },
                ${linkNames.res2}: async (${lower}Model, data, koaContext) => {
                    return  entry.dataloaders['${lower}'](koaContext, ${lower}Model.${linkNames.param2},${many})
                  }
            }
    `
        }
    }
    if (model.modelName == 'File') {
        body += `
    data: async (fileModel, data, koaContext) => {
      return entry.storage.loadDataFromFile(fileModel, data, koaContext)
    },`
    }
    body += `    
}
${linkAndUnlink}
`
    return body
}
