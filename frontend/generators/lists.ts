import { frontendTemplateToText, templateFileToText } from "../../services/common/files";
import { SchemaModel, SchemaModelMember, SchemaModelRelationType } from "../../services/common/types";
import { FrontendDirectory } from "../frontendDirectory";
import * as _ from 'lodash'

function getFields(members: SchemaModelMember[]) {
    let fields = '';
    for (const member of members.filter(m => !m.relation && m.name != 'id')) {
        fields += `,\n{name: '${member.name}', title:'${_.upperFirst(member.name)}'}`;
    }

    for (const member of members.filter(m => m.relation)) {
        // fields += `,\n${member.name}{id}`;
    }

    return fields.substr(2)
}


function list(model: SchemaModel) {
    
    let result = frontendTemplateToText(`list.tsx`,{
        MODEL_NAME: model.modelName,
        MODEL_FIELDS: getFields(model.members)
    });

    return result;
}

export const generateListssToFile = (frontendDirectory: FrontendDirectory, model: SchemaModel) => {
    frontendDirectory.genWrite(`${model.modelName}/List.tsx`, list(model));
    
};


export const generateLists = (frontendDirectory: FrontendDirectory, models: SchemaModel[]) => {

    for (const model of models) {
        generateListssToFile(frontendDirectory, model);
    }
};

export default generateLists

