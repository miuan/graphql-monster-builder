import { frontendTemplateToText, templateFileToText } from "../../common/files";
import { SchemaModel, SchemaModelMember, SchemaModelRelationType } from "../../common/types";
import { FrontendDirectory } from "../frontendDirectory";
import * as _ from 'lodash'

function getFields(members: SchemaModelMember[]) {
    let fields = '';
    for (const member of members.filter(m => (!m.relation && m.name !== 'id'))) {
        fields += `,\n\t{name: '${member.name}', label:'${_.upperFirst(member.name)}'`;
        if(member.placeholder) fields += `, placeholder: '${member.placeholder}'`
        if(member.regExp) fields += `, regexp: '${member.regExp}'`
        if(member.isRequired) fields += `, required: true`
        if(member.isReadonly) fields += `, readonly: true`
        fields += '}'
    }

    for (const member of members.filter(m => m.relation)) {
        // fields += `,\n${member.name}{id}`;
    }

    return fields.substr(2)
}


function edits(model: SchemaModel) {
    
    let result = frontendTemplateToText(`edit.tsx`,{
        MODEL_NAME: model.modelName,
        MODEL_FIELDS: getFields(model.members)
    });

    return result;
}

export const generateEditsToFile = (frontendDirectory: FrontendDirectory, model: SchemaModel) => {
    frontendDirectory.genWrite(`${model.modelName}/Edit.tsx`, edits(model));
    
};


export const generateEdits = (frontendDirectory: FrontendDirectory, models: SchemaModel[]) => {

    for (const model of models) {
        generateEditsToFile(frontendDirectory, model);
    }
};

export default generateEdits

