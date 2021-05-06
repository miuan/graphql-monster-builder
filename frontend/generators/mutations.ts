import { frontendTemplateToText, templateFileToText } from "../../services/common/files";
import { SchemaModel, SchemaModelMember, SchemaModelRelationType } from "../../services/common/types";
import { FrontendDirectory } from "../frontendDirectory";
import * as _ from 'lodash'

function getInputParams(members: SchemaModelMember[]) {
    let params = '', inputs = '';
    for (const member of members.filter(m => !m.relation)) {
        inputs += `, \$${member.name}: ${member.type}${member.isRequired ? '!' : ''}`;
        params += `, ${member.name}: \$${member.name}`;
    }

    for (const member of members.filter(m => (m.relation?.type == SchemaModelRelationType.ONE_TO_MANY || m.relation?.type == SchemaModelRelationType.ONE_TO_ONE))) {
        inputs += `, \$${member.name}Id: ID`;
        params += `, ${member.name}Id: \$${member.name}Id`;
        inputs += `, \$${member.name}: ${member.type}`;
        params += `, ${member.name}: \$${member.name}`;
    }

    for (const member of members.filter(m => (m.relation?.type == SchemaModelRelationType.MANY_TO_MANY || m.relation?.type == SchemaModelRelationType.MANY_TO_ONE))) {
        inputs += `, \$${member.name}Ids: [ID!]`;
        params += `, ${member.name}Ids: \$${member.name}Ids`;
        inputs += `, \$${member.name}: ${member.type}`;
        params += `, ${member.name}: \$${member.name}`;
    }

    return { params, inputs };
}


function updateMutation(model: SchemaModel) {
    let { params, inputs } = getInputParams(model.members.filter((m=>m.name !== 'user')));

    let result = frontendTemplateToText(`graphql/mutation.gql`,{
        'MUTATION_NAME': `update${_.upperFirst(model.modelName)}`,
        PARAMS: params.substr(2),
        INPUTS: inputs.substr(2),
        FRAGMENT_NAME: `${_.upperFirst(model.modelName)}Fragment`
      });

      return result;
}

function createMutation(model: SchemaModel) {
    let { params, inputs } = getInputParams(model.members.filter((m=>m.name !== 'user')));

    const userPresent = model.members.filter((m=>m.name == 'user'))[0]

    if(userPresent && userPresent.isRequired){
        inputs += `, \$userId: ID!`;
        params += `, userId: \$userId`;
    }

    let result = frontendTemplateToText(`graphql/mutation.gql`,{
        'MUTATION_NAME': `create${_.upperFirst(model.modelName)}`,
        PARAMS: params.substr(2),
        INPUTS: inputs.substr(2),
        FRAGMENT_NAME: `${_.upperFirst(model.modelName)}Fragment`
    });

    return result;
}

function deleteMutation(model: SchemaModel) {
    return frontendTemplateToText(`graphql/delete.gql`, {'MODEL_NAME': model.modelName });
}

export const generateMutationsToFile = (frontendDirectory: FrontendDirectory, model: SchemaModel) => {
    frontendDirectory.genWrite(`${model.modelName}/graphql/create.gql`, createMutation(model));
    frontendDirectory.genWrite(`${model.modelName}/graphql/update.gql`, updateMutation(model));
    frontendDirectory.genWrite(`${model.modelName}/graphql/delete.gql`, deleteMutation(model));
};


export const generateMutations = (frontendDirectory: FrontendDirectory, models: SchemaModel[]) => {
    for (const model of models) {
        generateMutationsToFile(frontendDirectory, model);
    }
};

export default generateMutations

