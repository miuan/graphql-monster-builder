
import { SchemaModel, SchemaModelMember, StructureBackend } from '../../common/types';
import logger from '../../log'
import { BackendDirectory } from '../backendDirectory';
import * as _ from 'lodash'
const log = logger.getLogger('model')


const VARIABLE_CONFIG_SKIP = 'VARIABLE_CONFIG_SKIP';

// https://stackoverflow.com/a/31379050
function randomDate(start = new Date(2020, 0, 1), end = new Date(), startHour = 0, endHour = 0) {
    var date = new Date(+start + Math.random() * (end.getTime() - start.getTime()));
    var hour = startHour + Math.random() * (endHour - startHour) | 0;
    date.setHours(hour);
    return date;
  }

function wrapStringValue(member: SchemaModelMember, value: any){
    if(member.modelName == 'String' || member.modelName == 'DateTime') return `'${value}'`
    return value
}

function createTestAll(type: string, model: SchemaModel, role) {
    const queryName = `all${model.modelName}`
    let res = ''

    let members = model.members.filter((m)=>!m.relation).map((m)=>m.name)
    let relations = model.members.filter((m)=>m.relation).map((m)=>`${m.name}{id}`)
    res += `const query = \`{query ${queryName} {
        ${[...members, ...relations].join(',')}
    }\`
    
    const res = await server.query({
        query,
        variables: { }
      });

    expect(res).not.toHaveProperty('data.${queryName}.token')
    expect(res).not.toHaveProperty('data.${queryName}.refreshToken')
    expect(res).toHaveProperty('errors')
    `
    return res;
}


function generateFields(model: SchemaModel, members: SchemaModelMember[], queryName: string, variables: any = {}, error=false) {
    let res = ''
    
    
    let not = error ? 'not.' : ''
    res += error ? `expect(response).toHaveProperty('errors')` : `expect(response).not.toHaveProperty('errors')`


    for(const member of members){

        if(member.relation){
            const variableName = member.relation.payloadNameForCreate
            const relatedVariables = variables[variableName]

            if(member.isArray){
                if(relatedVariables){
                    let count = 0
                    for(const relatedVariable of relatedVariables){

                        for(const relatedMember of member.relation.relatedModel.members){
                            const rmName = relatedMember.name
                            const rmValue = relatedVariable[rmName]
                            if(rmValue){
                                res += `\nexpect(response).${not}toHaveProperty('data.${queryName}.${member.name}.${count}.${rmName}', ${wrapStringValue(relatedMember, rmValue)})`
                            }
                        }
                            
                        count++;
                    }

                }

                const relatedMemberName = member.relation.relatedMember?.name
                if(relatedMemberName){
                    for(let i = 0; i < 3; i++) res += `\nexpect(response).${not}toHaveProperty('data.${queryName}.${member.name}.${i}.${relatedMemberName}.id', response.data.${queryName}.id)`
                }
                
                for(let i = 0; i < 3; i++) res += `\nexpect(response).${not}toHaveProperty('data.${queryName}.${member.name}.${i}.id')`
            } else {
                if(relatedVariables){
            
                }
                res += `\nexpect(response).${not}toHaveProperty('data.${queryName}.${member.name}.id')`
            }
            

        } else if(variables[member.name]){
            let variable = variables[member.name]

            variable = Array.isArray(variable) ? '[' + variable.reduce((p,c)=>`${p},${wrapStringValue(member,c)}`, '').substr(1) + ']' : wrapStringValue(member, variable)
            res += `\nexpect(response).${not}toHaveProperty('data.${queryName}.${member.name}', ${variable})`
        } else {
            res += `\nexpect(response).${not}toHaveProperty('data.${queryName}.${member.name}')`
        }
    }
    
    return res
}

function generateVariables(model: SchemaModel, members: SchemaModelMember[], {skipRelation, config}:{skipRelation?:string, config?:any}={skipRelation:'', config: {}}) {
    let variables = {} as any
    
    for(const member of members){
        if(config && config[member.name]){
            // maybe config say it should be skip at all
            if(config[member.name] !== VARIABLE_CONFIG_SKIP) variables[member.name] = config[member.name]
        } else if(!member.relation){
            const variable = generateRandomVariable(model, member)
            variables[member.name] = !member.isArray ? variable : [
                variable,
                generateRandomVariable(model, member),
                generateRandomVariable(model, member)
            ]
        } else if(member.relation.name !== skipRelation){
            const options = {skipRelation:member.relation.name, config:{id: VARIABLE_CONFIG_SKIP}}
            const relatedModel = member.relation.relatedModel
            const relatedVariable = generateVariables(relatedModel, relatedModel.members, options)
            
            variables[member.relation.payloadNameForCreate] = !member.isArray ? relatedVariable : [
                relatedVariable,
                generateVariables(relatedModel, relatedModel.members, options),
                generateVariables(relatedModel, relatedModel.members, options)
            ]

            if(config && config[member.relation.payloadNameForId]) {
                variables[member.relation.payloadNameForId] = config[member.relation.payloadNameForId]
            }

        } 
    }
    
    return variables
}


function generateRandomVariable(model: SchemaModel, member: SchemaModelMember) {
    if (member.modelName == 'Int') {
        return Math.round(Math.random() * 1000000);
    } else if (member.modelName == 'Float') {
        return Math.random() * 1000000;
    } else if (member.modelName == 'DateTime') {
        return randomDate().toISOString();
    }

    return `${model.modelName}/${member.name}/${Math.random().toString(36).substring(5)}`;
}

function createTestCreate(model: SchemaModel, members: SchemaModelMember[], requiredOnly=false) {
    const mutationName = `create${model.modelName}`
    const mutationDesc = `Create${model.modelName}`
    let res = ''

    let output = generateOutputFromMembers(members)
    let variableInputs = generateVariableInputsFromMembers(members)
    let mutationInputs = members.filter((m)=>m.name !== 'id').map((m)=> m.relation? `${m.relation.payloadNameForCreate}: $${m.relation.payloadNameForCreate}, ${m.relation.payloadNameForId}: $${m.relation.payloadNameForId}` : `${m.name}: $${m.name}`).join(',')

    const config = {
        id: VARIABLE_CONFIG_SKIP
    }
    for(const memberWithRelation of members.filter((m)=>m.relation && m.relation.relatedMember)){
        res += generateMongooseModelCreate(memberWithRelation, config);
    }
    
    const variables = generateVariables(model, members, {config})


    res += `const mutation = \`mutation ${mutationDesc}(${variableInputs}){
        ${mutationName}(${mutationInputs}) {
           ${output.join(',')}
        }
    }\`
    
    const response = await server.mutate({
        mutation,
        variables: ${JSON.stringify(variables, null, '\t').replace(/"=>/g, '').replace(/<="/g, '')}
      }, res.data.login_v1.token);

    ${generateFields(model, members, mutationName, variables)}
    `
    return res;
}

function generateMongooseModelCreate(member: SchemaModelMember, globalConfig: any) {
    const modelName = `model${member.modelName}`;
    const relatedModel = member.relation.relatedModel;
    const relatedMember = member.relation.relatedMember;
    const config = {
        [relatedMember.name]: !relatedMember.isArray && relatedMember.isRequired ? '607bc7944481571f509470a2' : VARIABLE_CONFIG_SKIP,
    };
    const modelData = generateVariablesMulti(relatedModel, relatedModel.members, { config });
    
    globalConfig[member.relation.payloadNameForId] = [
        `=>${modelName}Data[0].id<=`,
        `=>${modelName}Data[1].id<=`,
        `=>${modelName}Data[2].id<=`
    ]
    
    return `

        const ${modelName} = server.entry.models['${_.lowerFirst(member.modelName)}']

        const ${modelName}Data = await Promise.all([
            ${modelName}.create(${JSON.stringify(modelData[0], null, '\t\t\t\t')}),
            ${modelName}.create(${JSON.stringify(modelData[1], null, '\t\t\t\t')}),
            ${modelName}.create(${JSON.stringify(modelData[2], null, '\t\t\t\t')})
        ])

    `;
}

function generateVariablesMulti(model: SchemaModel, members: SchemaModelMember[], config:any, length=3) {
    return Array.from({length}, ()=>generateVariables(model, members, config))
}

function generateVariableInputsFromMembers(members: SchemaModelMember[]) {
    return members.filter((m) => m.name !== 'id').map((m) => {

        let mapped = '';

        if (m.relation) {
            const name = m.relation.payloadNameForCreate;
            const nameId = m.relation.payloadNameForId
            mapped = m.isArray ? `$${name}: [${m.relation.inputName}!],` : `$${name}: ${m.relation.inputName},`;
            mapped += m.isArray ? `$${nameId}: [ID!]` : `$${nameId}: ID`;
            return mapped
        } else {
            mapped = `$${m.name}: ${m.type}`;
            return m.isRequired ? `${mapped}!` : mapped;
        }

        
    }).join(',');
}

function generateOutputFromMembers(members: SchemaModelMember[]) {
    return members.map((m) => {
        if (m.relation) {
            const relations = m.relation.relatedModel.members.map((rm) => rm.relation ? `${rm.name}{id}` : rm.name).join(',');
            return `${m.name}{${relations}}`;
        }
        return m.name;
    });
}

function createAdminTest(structure: StructureBackend, model: SchemaModel) {
    // throw new Error('Function not implemented.');
    let res = ''

    // res += createTestAll('all', model, 'admin')
    res += createTestCreate(model, model.members)

    return res
}

function createUserTest(structure: StructureBackend, model: any) {
    // throw new Error('Function not implemented.');

    return ''
}
  

export const generateTestToFile = (backendDirectory: BackendDirectory, model: SchemaModel) => {
    const str = createAdminTest(backendDirectory.structure, model);
    
    backendDirectory.genWrite(`/integration-tests/${model.modelName}-admin.spec.ts`, str);

    const userTest = createUserTest(backendDirectory.structure, model);
    backendDirectory.genWrite(`/integration-tests/${model.modelName}-user.spec.ts`, userTest);
  };
  
  
  export const generateIntegrationTests = (backendDirectory: BackendDirectory, models: SchemaModel[]) => {
    log.trace('generateModels')
    for (const model of models) {
      log.info(`Generate model: ${model.modelName}`)
      generateTestToFile(backendDirectory, model);
    }
  };
