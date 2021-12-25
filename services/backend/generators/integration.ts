import { SchemaModel, SchemaModelMember, StructureBackend } from '../../common/types'
import logger from '../../log'
import { BackendDirectory } from '../backendDirectory'
import * as _ from 'lodash'
import { type } from 'os'
import { firstToLower } from '../../common/utils'
const log = logger.getLogger('model')

const VARIABLE_CONFIG_SKIP = 'VARIABLE_CONFIG_SKIP'

const exludeMembersForCreation = (m) => !['createdAt', 'updatedAt', 'id'].includes(m.name) && !m.relation
const exludeMembersForUpdation = (m) => !['createdAt', 'updatedAt'].includes(m.name) && !m.relation

// https://stackoverflow.com/a/31379050
function randomDate(start = new Date(2020, 0, 1), end = new Date(), startHour = 0, endHour = 0) {
    const date = new Date(+start + Math.random() * (end.getTime() - start.getTime()))
    const hour = (startHour + Math.random() * (endHour - startHour)) | 0
    date.setHours(hour)
    return date
}

function wrapStringValue(member: SchemaModelMember, value: any) {
    if (member.modelName == 'String' || member.modelName == 'DateTime') return `'${value}'`
    return value
}

function generateVariables(
    model: SchemaModel,
    members: SchemaModelMember[],
    { skipRelation, config, forMongoose }: { skipRelation?: string; config?: any; forMongoose?: boolean } = {
        skipRelation: '',
        config: {},
    },
) {
    const variables = {} as any

    for (const member of members) {
        if (config && config[member.name]) {
            // maybe config say it should be skip at all
            if (config[member.name] !== VARIABLE_CONFIG_SKIP) variables[member.name] = config[member.name]
        } else if (!member.relation) {
            const variable = generateRandomVariable(model, member)
            variables[member.name] = !member.isArray ? variable : [variable, generateRandomVariable(model, member), generateRandomVariable(model, member)]
        } else if (forMongoose && member.isRequired && !member.isArray) {
            // is relation single and is reauired
            variables[member.name] = '607bc7944481571f509470a2'
        } /*else if (member.relation.name !== skipRelation && model.modelName == `User`) {
            // TODO: if user have relations to objects it goes to stack
            const options = { skipRelation: member.relation.name, config: { id: VARIABLE_CONFIG_SKIP } }
            const relatedModel = member.relation.relatedModel

            if (member.isArray) {
                variables[member.relation.payloadNameForCreate] = Array.from(
                    {
                        length: config && config[member.name] ? config[member.name] : 1,
                    },
                    () => generateVariables(relatedModel, relatedModel.members, options),
                )
            } else {
                variables[member.relation.payloadNameForCreate] = generateVariables(relatedModel, relatedModel.members, options)
            } 

            if (config && config[member.relation.payloadNameForId]) {
                variables[member.relation.payloadNameForId] = config[member.relation.payloadNameForId]
            }
        } */
    }

    return variables
}

function generateRandomVariable(model: SchemaModel, member: SchemaModelMember) {
    if (member.modelName == 'Int') {
        return Math.round(Math.random() * 1000000)
    } else if (member.modelName == 'Float') {
        return Math.random() * 1000000
    } else if (member.modelName == 'DateTime') {
        return randomDate().toISOString()
    }

    return `${model.modelName}/${member.name}/${Math.random().toString(36).substring(5)}`
}

function generateMongooseModelCreate(member: SchemaModelMember, globalConfig: any) {
    const modelName = `model${member.modelName}`
    const relatedModel = member.relation.relatedModel
    const relatedMember = member.relation.relatedMember
    const config = {
        [relatedMember.name]: !relatedMember.isArray && relatedMember.isRequired ? '607bc7944481571f509470a2' : VARIABLE_CONFIG_SKIP,
    }
    const modelData = generateVariablesMulti(relatedModel, relatedModel.members, { config })

    globalConfig[member.relation.payloadNameForId] = [`=>${modelName}Data[0].id<=`, `=>${modelName}Data[1].id<=`, `=>${modelName}Data[2].id<=`]

    return `const ${modelName} = server.entry.models['${_.lowerFirst(member.modelName)}']

        const ${modelName}Data = await Promise.all([
            ${modelName}.create(${JSON.stringify(modelData[0], null, '\t\t\t\t')}),
            ${modelName}.create(${JSON.stringify(modelData[1], null, '\t\t\t\t')}),
            ${modelName}.create(${JSON.stringify(modelData[2], null, '\t\t\t\t')})
        ])

    `
}

function generateVariablesMulti(model: SchemaModel, members: SchemaModelMember[], config: any, length = 3) {
    return Array.from({ length }, () => generateVariables(model, members, config))
}

function generateVariableInputsFromMembers(members: SchemaModelMember[]) {
    return members
        .filter((m) => !m.relation)
        .map((m) => {
            let mapped = ''

            // RELATION skipet becausee filter
            if (m.relation) {
                const name = m.relation.payloadNameForCreate
                const nameId = m.relation.payloadNameForId
                mapped = m.isArray ? `$${name}: [${m.relation.inputName}!],` : `$${name}: ${m.relation.inputName},`
                mapped += m.isArray ? `$${nameId}: [ID!]` : `$${nameId}: ID`
                return mapped
            } else {
                mapped = `$${m.name}: ${m.type}`
                return m.isRequired ? `${mapped}!` : mapped
            }
        })
        .join(',')
}

function generateOutputFromMembers(members: SchemaModelMember[]) {
    return members.map((m) => {
        if (m.relation) {
            const relations = m.relation.relatedModel.members.map((rm) => (rm.relation ? `${rm.name}{id}` : rm.name)).join(',')
            return `${m.name}{${relations}}`
        }
        return m.name
    })
}

function generateArrayContaining(relatedVariables: any, member: SchemaModelMember, queryName: string) {
    let arrayContaining = ``

    for (const relatedVariable of relatedVariables) {
        const additions = []
        const relatedMemberName = member.relation.relatedMember?.name
        if (relatedMemberName) {
            additions.push(`${relatedMemberName}:expect.objectContaining({id:${queryName}Response.id})`)
        }
        const objectContaining = generateObjectContain(member.relation.relatedModel.members, relatedVariable, additions)
        arrayContaining += `,\n\t${objectContaining}`
    }
    arrayContaining = `expect.arrayContaining([${arrayContaining.substr(1)}])`

    return arrayContaining
}

function generateObjectContain(members: SchemaModelMember[], relatedVariable: any, additions: any, wrapValue = wrapStringValue) {
    let objectContaining = ``
    for (const relatedMember of members.filter(exludeMembersForUpdation)) {
        const rmName = relatedMember.name
        const rmValue = relatedVariable[rmName]

        if (rmValue) {
            if (relatedMember.relation) {
                // if (Array.isArray(rmValue)) {
                //     let newObjectsContaining = ''
                //     objectContaining += `,${rmName}: expect.arrayContaining([`
                //     for (const rmArrayValue of rmValue) {
                //         newObjectsContaining += `,\n${generateObjectContain(relatedMember.relation.relatedModel.members, rmArrayValue, [], wrapValue)}`
                //     }
                //     objectContaining += newObjectsContaining.substr(1)
                //     objectContaining += `])`
                // } else if (typeof rmValue === 'object') {
                //     objectContaining += `,${relatedMember.name}: ${generateObjectContain(relatedMember.relation.relatedModel.members, rmValue, [], wrapValue)}`
                // }
            } else {
                objectContaining += `,${rmName}: ${wrapValue ? wrapValue(relatedMember, rmValue) : rmValue}`
            }
        }
    }
    for (const addition of additions) {
        objectContaining += `,${addition}`
    }
    return `expect.objectContaining({${objectContaining.substr(1)}})`
}

function generateExpects(model: SchemaModel, members: SchemaModelMember[], queryName: string, variables: any = {}, wrap = (member, variable) => variable, error = false) {
    let res = ''

    const not = error ? 'not.' : ''
    res += error ? `expect(${queryName}Response).toHaveProperty('errors')` : `expect(${queryName}Response).not.toHaveProperty('errors')`

    for (const member of members) {
        if (member.relation) {
            const variableName = member.relation.payloadNameForCreate
            const relatedVariables = variables[variableName]

            if (member.isArray) {
                // test is array is for One where is comming `createModel1Response.data.createModel1.model2` and thats generate milion of test lines
                if (relatedVariables && Array.isArray(relatedVariables)) {
                    const arrayContaining = generateArrayContaining(relatedVariables, member, queryName)
                    res += `\nexpect(${queryName}Response.data.${queryName}.${member.name}).${not}toEqual(${arrayContaining})`
                }
                const variableNameId = member.relation.payloadNameForId
                const relatedVariablesIds = variables[variableNameId]
                if (relatedVariablesIds) {
                    const rvi = relatedVariablesIds.map((c) => ({ id: c.replace(/=>/g, '').replace(/<=/g, '') }))
                    const arrayContaining = generateArrayContaining(rvi, member, queryName)

                    res += `\nexpect(${queryName}Response.data.${queryName}.${member.name}).${not}toEqual(${arrayContaining})`
                }

                for (let i = 0; i < 2; i++) res += `\nexpect(${queryName}Response).${not}toHaveProperty('data.${queryName}.${member.name}.${i}.id')`
            } else {
                if (relatedVariables) {
                }
                res += `\nexpect(${queryName}Response).${not}toHaveProperty('data.${queryName}.${member.name}')`
            }
        } else if (variables[member.name] && !['createdAt', 'updatedAt'].includes(member.name)) {
            // const toString = ['createdAt', 'updatedAt'].includes(member.name) ? '.toString()' : ''
            let variable = variables[member.name]

            variable = Array.isArray(variable) ? '[' + variable.reduce((p, c) => `${p},${wrap(member, c)}`, '').substr(1) + ']' : wrap(member, variable)
            res += `\nexpect(${queryName}Response).${not}toHaveProperty('data.${queryName}.${member.name}', ${variable})`
        } else {
            res += `\nexpect(${queryName}Response).${not}toHaveProperty('data.${queryName}.${member.name}')`
        }
    }

    return res
}

function createTestCreate(model: SchemaModel, members: SchemaModelMember[], forTest = false) {
    const mutationName = `create${model.modelName}`
    const mutationDesc = `Create${model.modelName}`
    let res = ''

    const createMembers = members.filter(exludeMembersForCreation)

    const output = generateOutputFromMembers(forTest ? createMembers : members)
    const variableInputs = generateVariableInputsFromMembers(createMembers)
    const mutationInputs = createMembers
        .map((m) => (m.relation ? `${m.relation.payloadNameForCreate}: $${m.relation.payloadNameForCreate}, ${m.relation.payloadNameForId}: $${m.relation.payloadNameForId}` : `${m.name}: $${m.name}`))
        .join(',')

    const config = {
        id: VARIABLE_CONFIG_SKIP,
    }

    // if (forTest) {
    //     for (const memberWithRelation of members.filter((m) => m.relation && m.relation.relatedMember)) {
    //         res += generateMongooseModelCreate(memberWithRelation, config)
    //     }
    // }

    const variables = generateVariables(model, members, { config })
    if (forTest) res += `const data = ` + JSON.stringify(variables, null, '\t').replace(/"=>/g, '').replace(/<="/g, '')

    res += `\nconst ${mutationName}Mutation = \`mutation ${mutationDesc}(${variableInputs}){
        ${mutationName}(${mutationInputs}) {
           ${output.join(',')}
        }
    }\`
    
    const ${mutationName}Response = await server.mutate({
        mutation: ${mutationName}Mutation,
        variables: data
      }, token);
    `

    if (forTest) {
        res += generateExpects(model, createMembers, mutationName, variables, (m, v) => wrapStringValue(m, v))
    }

    return res
}

function createTestOne(model: SchemaModel, beforeMutation = 'create') {
    const queryName = `one${model.modelName}`
    const beforeMutationName = `${beforeMutation}${model.modelName}`
    const beforeMutationResponseName = `${beforeMutationName}Response`
    let res = ''
    const output = generateOutputFromMembers(model.members)
    const regEx = new RegExp(`data\\.${queryName}\\.`, 'g')
    //const variables = generateVariables(model, members, {config})
    const variables = model.members.reduce((accumulator, member) => {
        if (member.relation) {
            accumulator[member.name] = Array.from({ length: 2 }, (i, c) => ({
                id: `${beforeMutationResponseName}.${member.name}[${c}].id`,
            }))
        } else accumulator[member.name] = `${beforeMutationResponseName}.${member.name}`
        return accumulator
    }, {})

    res += `const ${queryName}Query = \`query ${model.modelName}($id: ID!){
        ${model.modelName}(id: $id) {
            ${output.join(',')}
        }
    }\`
    
    const ${queryName}Response = await server.query({
        query: ${queryName}Query,
        variables: { id: ${beforeMutationName}Response.id}
      }, token);

      ${generateExpects(model, model.members, queryName, variables).replace(regEx, `data.${model.modelName}.`)}

    `
    return res
}

function createTestOneApi(model: SchemaModel, beforeMutation = 'create') {
    const queryName = `one${model.modelName}`
    const regEx = new RegExp(`data\\.${queryName}\\.`, 'g')
    const lower = firstToLower(model.modelName)

    const beforeMutationName = `${beforeMutation}${model.modelName}`
    const beforeMutationResponseName = `${beforeMutationName}Response`
    let res = ''

    //const variables = generateVariables(model, members, {config})
    const variables = model.members.reduce((accumulator, member) => {
        if (member.relation) {
            accumulator[member.name] = Array.from({ length: 2 }, (i, c) => ({
                id: `${beforeMutationResponseName}.${member.name}[${c}].id`,
            }))
        } else accumulator[member.name] = `${beforeMutationResponseName}.${member.name}`
        return accumulator
    }, {})

    res += `
      const ${queryName}Response = await server.get('/api/${lower}/' + ${beforeMutationName}Response.id, token);

      ${generateExpects(model, model.members, queryName, variables).replace(regEx, `body.${lower}.`)}

    `
    return res
}

function createTestAll(model: SchemaModel) {
    const queryName = `all${model.modelName}`
    const beforeMutationName = `create${model.modelName}`
    const beforeMutationResponseName = `${beforeMutationName}Response.data.${beforeMutationName}`
    let res = ''
    const output = generateOutputFromMembers(model.members)
    const regEx = new RegExp(`data\\.${queryName}\\.`, 'g')

    //const variables = generateVariables(model, members, {config})
    const variables1 = createVariablesForAll(model, `${beforeMutationName}Response`)
    const variables2 = createVariablesForAll(model, `${beforeMutationName}Response2`)

    res += `const ${queryName}Query = \`query all${model.modelName} {
        all${model.modelName} {
            ${output.join(',')}
        }
    }\`
    
    const ${queryName}Response = await server.query({
        query: ${queryName}Query,
        variables: { id: ${beforeMutationName}Response.id}
      }, token)

    `

    // test is array is for One where is comming `createModel1Response.data.createModel1.model2` and thats generate milion of test lines
    const arrayContaining = `expect.arrayContaining([
        ${generateObjectContain(model.members, variables1, [], null)},
        ${generateObjectContain(model.members, variables2, [], null)}
    ])`
    res += `\nexpect(${queryName}Response.data.${queryName}).toEqual(${arrayContaining})`

    return res
}

function createVariablesForAll(model: SchemaModel, beforeMutationResponseName: string) {
    return model.members.reduce((accumulator, member) => {
        if (member.relation) {
            accumulator[member.name] = Array.from({ length: 2 }, (i, c) => {
                const obj = {
                    id: `${beforeMutationResponseName}.${member.name}[${c}].id`,
                    model1: { id: `${beforeMutationResponseName}.id` },
                }

                for (const relatedMember of member.relation.relatedModel.members) {
                    obj[relatedMember.name] = `${beforeMutationResponseName}.${member.name}[${c}].${relatedMember.name}`
                }

                return obj
            })
        } else accumulator[member.name] = `${beforeMutationResponseName}.${member.name}`
        return accumulator
    }, {})
}

function createTestUpdate(model: SchemaModel, members: SchemaModelMember[], beforeMutation = 'create') {
    const mutationName = `update${model.modelName}`
    const mutationDesc = `Update${model.modelName}`
    const beforeMutationName = `${beforeMutation}${model.modelName}`
    const beforeMutationResponseName = `${beforeMutationName}Response`
    let res = ''

    const membersForUpdation = members.filter(exludeMembersForUpdation)
    const output = generateOutputFromMembers(membersForUpdation)
    const variableInputs = generateVariableInputsFromMembers(membersForUpdation)
    const mutationInputs = membersForUpdation
        .map((m) => (m.relation ? `${m.relation.payloadNameForCreate}: $${m.relation.payloadNameForCreate}, ${m.relation.payloadNameForId}: $${m.relation.payloadNameForId}` : `${m.name}: $${m.name}`))
        .join(',')

    const config = {
        id: `=>${beforeMutationName}Response.id<=`,
    }
    // for (const memberWithRelation of members.filter((m) => m.relation && m.relation.relatedMember)) {
    //     res += generateMongooseModelCreate(memberWithRelation, config)
    // }

    const variables = generateVariables(model, membersForUpdation, { config })

    res += `const ${mutationName}Mutation = \`mutation ${mutationDesc}(${variableInputs}){
        ${mutationName}(${mutationInputs}) {
           ${output.join(',')}
        }
    }\`
    
    const ${mutationName}Response = await server.mutate({
        mutation: ${mutationName}Mutation,
        variables: ${JSON.stringify(variables, null, '\t').replace(/"=>/g, '').replace(/<="/g, '')}
      }, token);

    ${generateExpects(model, membersForUpdation, mutationName, variables, (m, v) => wrapStringValue(m, v))
        .replace(/=>/g, '')
        .replace(/<=/g, '')}
    `
    return res
}

function createTestRemove(model: SchemaModel, beforeMutation = 'create') {
    const mutationName = `remove${model.modelName}`
    const mutationDesc = `Remove${model.modelName}`
    const beforeMutationName = `${beforeMutation}${model.modelName}`
    let res = ''

    const output = generateOutputFromMembers(model.members)
    const variableInputs = generateVariableInputsFromMembers(model.members.filter((m) => m.name == 'id'))
    const mutationInputs = model.members
        .filter((m) => m.name == 'id')
        .map((m) => `${m.name}: $${m.name}`)
        .join(',')

    const config = {
        id: `=>${beforeMutationName}Response.id<=`,
    }

    const variables = generateVariables(model, model.members, { config })

    res += `const ${mutationName}Mutation = \`mutation ${mutationDesc}(${variableInputs}){
        ${mutationName}(${mutationInputs}) {
           id
        }
    }\`
    
    const ${mutationName}Response = await server.mutate({
        mutation: ${mutationName}Mutation,
        variables: { id:${beforeMutationName}Response.id }
      }, token);

      ${generateExpects(
          model,
          model.members.filter((m) => m.name === 'id'),
          mutationName,
          { id: `${beforeMutationName}Response.id` },
          (m, v) => wrapStringValue(m, v),
      )
          .replace(/=>/g, '')
          .replace(/<=/g, '')}

          ${generateCheckExistenceInMongo(model, `${beforeMutationName}Response.id`, false)}
    `

    // for (const relatedMember of model.members.filter((m) => m.relation)) {
    //     if (relatedMember.isArray) {
    //         const check = generateCheckExistenceInMongo(relatedMember.relation.relatedModel, `check.id`, !relatedMember.relation.relatedMember.isRequired, 1)

    //         res += `
    //             for(const check of ${beforeMutationName}Response.data.${beforeMutationName}.${relatedMember.name}){
    //                 ${check}
    //             }
    //         `
    //     } else {
    //         res += generateCheckExistenceInMongo(
    //             relatedMember.relation.relatedModel,
    //             `${beforeMutationName}Response.data.${beforeMutationName}.${relatedMember.name}`,
    //             !relatedMember.relation.relatedMember.isRequired,
    //             1,
    //         )
    //     }
    // }

    return res
}

function generateCheckExistenceInMongo(model: SchemaModel, beforeMutationName, shouldExist = true, iteration = 0, beforeMutation = 'create') {
    const lower = _.lowerFirst(model.modelName)
    const check = `${lower}Check${iteration == 0 ? '' : iteration.toString()}`
    const expect = shouldExist ? `toBeObject()` : `toBeNull()`
    return `
          const ${check} = await server.entry.models['${lower}'].findById(${beforeMutationName})
          expect(${check}).${expect}
    `
}

function wrapTest(name, model: SchemaModel, { token, createModelFn = 0 }) {
    const numCreatedRelations = 1
    const numLinkedRelations = 1
    let createModelLine = ''
    if (createModelFn) {
        createModelLine = Array.from({ length: createModelFn }, (value, index) => {
            const relatedMembers = model.members.filter((m) => m.relation)
            const indexName = index < 1 ? '' : index + 1
            const dataForCreateFn = JSON.stringify(generateVariables(model, model.members.filter(exludeMembersForCreation)))

            const relationsForCreateFnRaw = createRelatedMembersVariables(relatedMembers, numLinkedRelations, true)
            const relationsForCreateFn = JSON.stringify(relationsForCreateFnRaw)

            return `
                // createModelLine: start
                const create${model.modelName}Response${indexName} = await create${model.modelName}(server, ${token}, ${dataForCreateFn})
                // createModelLine: end`
        }).join('\n')
    }

    let test = ''

    if (name === 'create') {
        test = createTestCreate(model, model.members, true)
    } else if (name === 'one') {
        test = createTestOne(model)
    } else if (name === 'update') {
        test = createTestUpdate(model, model.members)
    } else if (name === 'all') {
        test = createTestAll(model)
    } else if (name === 'remove') {
        test = createTestRemove(model)
    } else if (name === 'one:api') {
        test = createTestOneApi(model)
    }

    return `
        it('${name} ${model.modelName}', async()=>{
            const token = ${token}.token
            ${createModelLine}  
            ${test}
        })
    `
}

function createRelatedMembersVariables(relatedMembers: SchemaModelMember[], numLinkedRelations: number, forMongoose = false) {
    return relatedMembers.reduce((a, c) => {
        a[c.name] = Array.from({ length: numLinkedRelations }, (_, idx) => {
            // const requiredRelations =
            //     !mutationObject &&
            //     c.relation.relatedModel.members
            //         .filter((crm) => crm.relation && crm.isRequired)
            //         .reduce((a, c) => {
            //             a[c.name] = '607bc7944481571f509470a2'
            //             return a
            //         }, {})
            const gv = generateVariables(
                c.relation.relatedModel,
                c.relation.relatedModel.members.filter((rm) => rm.name !== 'id'),
                {
                    skipRelation: c.relation.name,
                    forMongoose,
                },
            )
            return gv
        })
        return a
    }, {})
}

function generateCreateModelFunction(model: SchemaModel) {
    const modelName = model.modelName

    let relations = ''
    // for (const relatedMember of model.members.filter((m) => m.relation)) {
    //     const memberName = relatedMember.name
    //     const memberRelationsList = `relations['${memberName}']`

    //     if (relatedMember.isArray) {
    //         relations += `
    //         if(${memberRelationsList} && Array.isArray(${memberRelationsList})){
    //             const model${memberName} = server.entry.models['${_.lowerFirst(memberName)}']
    //             const model${memberName}Data = await Promise.all(${memberRelationsList}.map((m)=>model${memberName}.create(m)))
    //             data.${relatedMember.relation.payloadNameForId} = model${memberName}Data.map(d=>d.id)
    //         }
    //     `
    //     } else {
    //         relations += `
    //         if(${memberRelationsList} ){
    //             const model${memberName} = server.entry.models['${_.lowerFirst(memberName)}']
    //             const model${memberName}Data = await model${memberName}.create(${memberRelationsList})
    //             data.${relatedMember.relation.payloadNameForId} = model${memberName}Data.id
    //         }
    //     `
    //     }
    // }

    const lower = _.lowerFirst(model.modelName)
    return `export async function create${model.modelName}(server, {user}, data){
        data.user = user.id
        return server.entry.models['${lower}'].create(data)
    }`
}

const protections = (model) =>
    [
        'admin', //'user', 'pub'
    ]
        .map(
            (name) =>
                `
    describe('${name}:graphql', ()=>{
        ${wrapTest('create', model, { token: name })}
        ${wrapTest('one', model, { token: name, createModelFn: 1 })}
        ${wrapTest('update', model, { token: name, createModelFn: 1 })}
        ${wrapTest('remove', model, { token: name, createModelFn: 1 })}
        ${wrapTest('all', model, { token: name, createModelFn: 2 })}
    })

    describe('${name}:api', ()=>{
        
        ${wrapTest('one:api', model, { token: name, createModelFn: 1 })}
        
    })
`,
        )
        .join('\n')
/*
 */
function createAdminTest(structure: StructureBackend, models: SchemaModel[]) {
    // throw new Error('Function not implemented.');
    let res = ''

    res += `
    import { connectToServer, disconnectFromServer } from './helper'
    ${models.map((model) => generateCreateModelFunction(model)).join('\n')}
    `

    const describeModels = models
        .map(
            (model) => `
        describe('${model.modelName}', () => {
             ${protections(model)}
        })
    `,
        )
        .join('\n')

    res += `
    describe('integration', () => {
        let server
        let admin, user, pub
        
        beforeAll(async ()=>{
            server = await connectToServer()

            const res = await server.post(
                "/auth/login_v1?fields=token,refreshToken,user.id&alias=login",
                {
                  email: "admin@admin.test",
                  password: "admin@admin.test",
                }
              );
          
              // expect(res).toHaveProperty('status', 200)
              expect(res).toHaveProperty("body.login.token");
              expect(res.body.login.token).toMatch(
                /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/
              );
              expect(res).toHaveProperty("body.login.refreshToken");
              expect(res).toHaveProperty("body.login.user.id");
              expect(res).toHaveProperty("body.login.user.email", "admin@admin.test");
              // expect(res).toHaveProperty('body.login.user.roles', [{ name: 'admin' }])
              expect(res).not.toHaveProperty("errors");
          
              admin = res.body.login;

              const res2 = await server.post(
                "/auth/register_v1?fields=token,refreshToken,user.id&alias=register",
                {
                  email: "user@user.test",
                  password: "user@user.test",
                }
              );
          
              // expect(res).toHaveProperty('status', 200)
              expect(res2).toHaveProperty("body.register.token");
              expect(res2.body.register.token).toMatch(
                /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/
              );
              expect(res2).toHaveProperty("body.register.refreshToken");
              expect(res2).toHaveProperty("body.register.user.id");
              expect(res2).toHaveProperty("body.register.user.email", "user@user.test");
              // expect(res).toHaveProperty('body.register.user.roles', [{ name: 'admin' }])
              expect(res2).not.toHaveProperty("errors");
          
              user = res2.body.register.token;

              pub = {user: user.user, token: ''};
        })

        afterAll(async () => {
            disconnectFromServer(server)
        });

        ${describeModels}
       
    })`
    //

    return res
}

function createUserTest(structure: StructureBackend, model: any) {
    // throw new Error('Function not implemented.');

    return ''
}

export const generateTestToFile = (backendDirectory: BackendDirectory, models: SchemaModel[]) => {
    const str = createAdminTest(backendDirectory.structure, models)

    backendDirectory.genWrite(`/integration-tests/integration.spec.ts`, str)

    //const userTest = createUserTest(backendDirectory.structure, model)
    //backendDirectory.genWrite(`/integration-tests/${model.modelName}-user.integration.spec.ts`, userTest)
}

export const generateIntegrationTests = (backendDirectory: BackendDirectory, models: SchemaModel[]) => {
    log.trace('generateModels')

    generateTestToFile(
        backendDirectory,
        models.filter((model) => !['File', 'User', 'UserRole'].includes(model.modelName)),
    )
}
