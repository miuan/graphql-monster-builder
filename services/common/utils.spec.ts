import {getOnlyOneRelatedMember, searchModelsRelationsInModels} from './utils'
import {SchemaModel, SchemaModelMember} from './types'
import { modelTodoWithUserManyToManyRelation, modelTodoWithUserManyToOneRelation, modelUserWithTodoManyToManyRelation, modelUserWithTodoOneToManyRelation, relationUserOnPress, relationUserOnTodo, relationUserOnWall } from './utils.mocks'

describe('utils', () => {

    describe('searchModelsRelationsInModels', ()=>{

        

        it('should find UserOnTodo', ()=>{
            const {member} = searchModelsRelationsInModels('UserOnTodo', [
                {
                    members:[ 
                        relationUserOnWall
                    ]
                }, {
                    members:[ 
                        relationUserOnPress,
                        relationUserOnTodo
                    ]
                }
            ]as SchemaModel[])

            expect(member).toEqual(relationUserOnTodo)
        })

        it('should find UserOnWall', ()=>{
            const {member} = searchModelsRelationsInModels('UserOnWall', [
                {
                    members:[ 
                        relationUserOnWall
                    ]
                }, {
                    members:[ 
                        relationUserOnPress,
                        relationUserOnTodo
                    ]
                }
            ]as SchemaModel[])

            expect(member).toEqual(relationUserOnWall)
        })
    })

    describe('getOnlyOneRelatedMember', ()=> {
        it('should return relation User because in MANY_TO_MANY is alpabeticaly higher than Todo', ()=>{
            const onlyOne1 = getOnlyOneRelatedMember(modelUserWithTodoManyToManyRelation.members[0])
            const onlyOne2 = getOnlyOneRelatedMember(modelTodoWithUserManyToManyRelation.members[0])
            
            expect(onlyOne2).toEqual(modelUserWithTodoManyToManyRelation.members[0].relation.relatedModel.members[0])
            expect(onlyOne1).toBeNull()
        })

        it('should return relation User because in ONE_TO_MANY is on ONE page (Todo is MANY)', ()=>{
            const onlyOne1 = getOnlyOneRelatedMember(modelUserWithTodoOneToManyRelation.members[0])
            const onlyOne2 = getOnlyOneRelatedMember(modelTodoWithUserManyToOneRelation.members[0])
            
            expect(onlyOne1).toBeNull()
            expect(onlyOne2).toEqual(modelUserWithTodoOneToManyRelation.members[0].relation.relatedModel.members[0])
            
        })
    })

    
})