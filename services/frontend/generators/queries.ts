import { frontendTemplateToText, templateFileToText } from "../../common/files";
import { SchemaModel, SchemaModelMember, SchemaModelRelationType } from "../../common/types";
import { FrontendDirectory } from "../frontendDirectory";
import * as _ from 'lodash'

function one(model: SchemaModel) {
    
    let result = frontendTemplateToText(`graphql/one.gql`,{
        QUERY_FRAGMENT: `${_.upperFirst(model.modelName)}Fragment`,
        QUERY_TYPE: model.modelName,
        QUERY_NAME: _.camelCase(model.modelName)
    });

    return result;
}

function all(model: SchemaModel) {
    
    let result = frontendTemplateToText(`graphql/all.gql`,{
        QUERY_FRAGMENT: `${_.upperFirst(model.modelName)}Fragment`,
        MODEL_NAME: model.modelName
    });

    return result;
}


export const generateQueriesToFile = (frontendDirectory: FrontendDirectory, model: SchemaModel) => {
    frontendDirectory.genWrite(`${model.modelName}/graphql/one.gql`, one(model));
    frontendDirectory.genWrite(`${model.modelName}/graphql/all.gql`, all(model));
};

export const generateQueries = (frontendDirectory: FrontendDirectory, models: SchemaModel[]) => {

    for (const model of models) {
        generateQueriesToFile(frontendDirectory, model);
    }
};

export default generateQueries

