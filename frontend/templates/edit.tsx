import React from "react";
import { loader } from 'graphql.macro';
import { useParams } from "react-router-dom";
import * as _ from 'lodash'

import BaseEdit from "../../components/Editor/Edit"

export const CREATE_MUTATION = loader('./graphql/create.gql')
export const UPDATE_MUTATION = loader('./graphql/update.gql')
export const ONE_QUERY = loader('./graphql/one.gql');

export const FIELDS = [
MODEL_FIELDS
]

export type MODEL_NAMEEditType = {
    name?: string, 
    fields?: any
    createMutation?: any,
    updateMutation?: any,
    oneQuery?: any
  }

export const MODEL_NAMEEdit:(obj:MODEL_NAMEEditType)=>any = ({name, fields, createMutation, updateMutation, oneQuery }) => {
  let {id} = useParams() as any;
  
  return (<div className={`base-edit-MODEL_NAME base-edit`}>
      <BaseEdit 
        id={id} 
        name={name || 'MODEL_NAMEs'}
        fields={fields || FIELDS}
        query={{
            CREATE_MUTATION: createMutation || CREATE_MUTATION,
            UPDATE_MUTATION: updateMutation || UPDATE_MUTATION,
            QUERY: oneQuery || ONE_QUERY
        }}
      />
      </div>
  );
};

export default MODEL_NAMEEdit