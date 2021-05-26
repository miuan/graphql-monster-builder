
import { SchemaModel, SchemaModelMember, StructureBackend } from '../../common/types';
import logger from '../../log'
import { BackendDirectory } from '../backendDirectory';
const log = logger.getLogger('model')

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

function generateVariables(model: SchemaModel, members: SchemaModelMember[], {skipRelation}={skipRelation:''}) {
    let variables = {} as any
    
    for(const member of members){
        if(member.isArray){
            if(member.relation && member.relation.name !== skipRelation){
                const relatedModel = member.relation.relatedModel
                const relatedVariables = [
                    generateVariables(relatedModel, relatedModel.members, {skipRelation:member.relation.name}),
                    generateVariables(relatedModel, relatedModel.members, {skipRelation:member.relation.name}),
                    generateVariables(relatedModel, relatedModel.members, {skipRelation:member.relation.name})
                ]
                variables[member.relation.payloadNameForCreate] = relatedVariables
            } else if(member.modelName == 'String'){
                variables[member.name] = [
                    `${model.modelName}/${member.name}/${Math.random().toString(36).substring(5)}`,
                    `${model.modelName}/${member.name}/${Math.random().toString(36).substring(5)}`,
                    `${model.modelName}/${member.name}/${Math.random().toString(36).substring(5)}`,
                ]
            } else if(member.modelName == 'Int'){
                variables[member.name] = [
                    Math.round(Math.random()*10000000),
                    Math.round(Math.random()*10000000),
                    Math.round(Math.random()*10000000),
                ]
            } else if(member.modelName == 'Float'){
                variables[member.name] = [
                    Math.random()*1000000,
                    Math.random()*1000000,
                    Math.random()*1000000,
                ]
            } else if(member.modelName == 'DateTime'){
                variables[member.name] = [
                    Math.random()*1000000,
                    Math.random()*1000000,
                    Math.random()*1000000,
                ]
            }
        } else {
            if(member.relation && member.relation.name !== skipRelation){
                const relatedModel = member.relation.relatedModel
                const relatedVariables = generateVariables(relatedModel, relatedModel.members, {skipRelation:member.relation.name})
                variables[member.relation.payloadNameForCreate] = relatedVariables
            } else if(member.modelName == 'String'){
                variables[member.name] = `${model.modelName}/${member.name}/${Math.random().toString(36).substring(5)}`
            } else if(member.modelName == 'Int'){
                variables[member.name] = Math.round(Math.random()*1000000)
            } else if(member.modelName == 'Float'){
                variables[member.name] = Math.random()*1000000
            } else if(member.modelName == 'DateTime'){
                variables[member.name] = randomDate().toISOString()
            }
        }
        
    }
    
    return variables
}


function createTestCreate(model: SchemaModel, members: SchemaModelMember[], requiredOnly=false) {
    const mutationName = `create${model.modelName}`
    const mutationDesc = `Create${model.modelName}`
    let res = ''

    let output = members.map((m)=>{
        if(m.relation){
            const relations = m.relation.relatedModel.members.map((rm)=>rm.relation? `${rm.name}{id}` : rm.name).join(',')
            return `${m.name}{${relations}}`
        } 
        return m.name
    })
    let inputs = members.filter((m)=>m.name !== 'id').map((m)=> {
        
        let mapped = ''

        if(m.relation){
            const name = m.relation.payloadNameForCreate
            mapped = m.isArray ? `$${name}: [${m.relation.inputName}!]`: `$${name}: ${m.relation.inputName}`
        } else {
            mapped =  `$${m.name}: ${m.type}`
        }
        

        return m.isRequired ? `${mapped}!` : mapped
    }).join(',')
    let inputs2 = members.filter((m)=>m.name !== 'id').map((m)=> m.relation? `${m.relation.payloadNameForCreate}: $${m.relation.payloadNameForCreate}` : `${m.name}: $${m.name}`).join(',')
    
    const variables = generateVariables(model, members)


    res += `const mutation = \`mutation ${mutationDesc}(${inputs}){
        ${mutationName}(${inputs2}) {
           ${output.join(',')}
        }
    }\`
    
    const response = await server.mutate({
        mutation,
        variables: ${JSON.stringify(variables, null, '\t')}
      }, res.data.login_v1.token);

    ${generateFields(model, members, mutationName, variables)}
    `
    return res;
}

function createAdminTest(structure: StructureBackend, model: SchemaModel) {
    // throw new Error('Function not implemented.');
    let res = ''

    res += createTestAll('all', model, 'admin')
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
