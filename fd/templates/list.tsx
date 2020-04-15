import React from 'react'
import {Link} from 'react-router-dom'
import gql from 'graphql-tag';
import { useQuery } from '@apollo/react-hooks';
import { ListRow, IListRowItem } from './row';


const USER_PROJECTS_QUERY = gql`
  query allProjects($userId:ID){ allProjects(filter:{AND:[{user_every:{id:$userId}}]}) {
      id
      name
    }}
`;

const ALL_PROJECTS_QUERY = gql`
  query allProjects($userId:ID){ allProjects {
      id
      name
    }}
`;

export interface IProjectList {
    userId?: string
}

export const ProjectList : React.FC<IProjectList> = ({userId}) => {
    const { loading, error, data } = useQuery(USER_PROJECTS_QUERY, {variables: {userId}});

    if (loading) return (<div>Loading...</div>);
    
    return (
        <div>
            <h1>List projects</h1>
            {error && (<div>{`Error! ${error.message}`}</div>)}
            <Link to={'project-create'}>Create</Link>

            {
              data && data.allProjects && data.allProjects.map((projectItem:IListRowItem)=>(<ListRow item={projectItem}/>))
            }
        </div>
    )
}