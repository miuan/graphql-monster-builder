import { frontendTemplateToText, templateFileToText } from "../../common/files";
import { SchemaModel, SchemaModelMember, SchemaModelRelationType } from "../../common/types";
import { FrontendDirectory } from "../frontendDirectory";
import * as _ from 'lodash'

function getFields(members: SchemaModelMember[]) {
    let fields = '';
    for (const member of members.filter(m => !m.relation)) {
        fields += `,\n${member.name}`;
    }

    for (const member of members.filter(m => m.relation)) {
        fields += `,\n${member.name}{id}`;
       
    }

    return fields.substr(2)
}


function fragment(model: SchemaModel) {
    
    let result = frontendTemplateToText(`graphql/fragment.gql`,{
        FRAGMENT_NAME: `${_.upperFirst(model.modelName)}Fragment`,
        FRAGMENT_TYPE: model.modelName,
        FRAGMENT_FIELDS: getFields(model.members)
    });

    return result;
}

export const generateFragmentsToFile = (frontendDirectory: FrontendDirectory, model: SchemaModel) => {
    frontendDirectory.genWrite(`${model.modelName}/graphql/fragment.gql`, fragment(model));
    
};


export const generateFragments = (frontendDirectory: FrontendDirectory, models: SchemaModel[]) => {

    for (const model of models) {
        generateFragmentsToFile(frontendDirectory, model);
    }
};

export default generateFragments

