import { getModelsFromSchema, extractMemberFromLine } from './scan'

describe('scan', () => {
    it('add default models in empty schema', async () => {
        const models = await getModelsFromSchema(``)
        expect(models.length).toEqual(3)

        expect(models[0].modelName).toEqual('UserRole')
        expect(models[1].modelName).toEqual('User')
        expect(models[2].modelName).toEqual('File')
    })

    describe('model and entities', () => {
        it('type Model1 @model {...', async () => {
            const models = await getModelsFromSchema(`
                type Model1 @model {
                    name: String! @isUnique
                }
            `)
            expect(models.length).toEqual(4)
            const model1 = models.find((m) => m.modelName == 'Model1')
            expect(model1).toHaveProperty('modelName', 'Model1')
            expect(model1).toHaveProperty('type', 'MODEL')
            expect(model1.members[0]).toHaveProperty('isArray', false)
            expect(model1.members[0]).toHaveProperty('isRequired', true)
        })

        it('type Model1 @entity {...', async () => {
            const models = await getModelsFromSchema(`
                type Model1 @entity {
                    name: String! @isUnique
                }
            `)
            expect(models.length).toEqual(4)
            const model1 = models.find((m) => m.modelName == 'Model1')
            expect(model1).toHaveProperty('modelName', 'Model1')
            expect(model1).toHaveProperty('type', 'ENTITY')
            expect(model1.members[0]).toHaveProperty('isArray', false)
            expect(model1.members[0]).toHaveProperty('isRequired', true)
        })

        it('model Model1 {...', async () => {
            const models = await getModelsFromSchema(`
                model Model1 {
                    name: String! @isUnique
                }
            `)
            expect(models.length).toEqual(4)
            const model1 = models.find((m) => m.modelName == 'Model1')
            expect(model1).toHaveProperty('modelName', 'Model1')
            expect(model1).toHaveProperty('type', 'MODEL')
            expect(model1.members[0]).toHaveProperty('isArray', false)
            expect(model1.members[0]).toHaveProperty('isRequired', true)
        })

        it('entity Model1 {...', async () => {
            const models = await getModelsFromSchema(`
            entity Model1 {
                    name: String! @isUnique
                }
            `)
            expect(models.length).toEqual(4)
            const model1 = models.find((m) => m.modelName == 'Model1')
            expect(model1).toHaveProperty('modelName', 'Model1')
            expect(model1).toHaveProperty('type', 'ENTITY')
            expect(model1.members[0]).toHaveProperty('isArray', false)
            expect(model1.members[0]).toHaveProperty('isRequired', true)
        })
    })

    describe('relations', () => {
        it('Model have only relations and any scalar type', async () => {
            expect(() =>
                getModelsFromSchema(`
                type Model1 @model {
                    model2:  @relation(name: "RelationName1")[]
                }
    
                type Model2 @model {
                    model1:  @relation(name: "RelationName1")
                }
            `),
            ).toThrowError(`Line 2: Model with name 'Model1' has only relations but any scalar type`)
        })

        it('relation not have a mate', async () => {
            expect(() =>
                getModelsFromSchema(`
                type Model1 @model {
                    name: String
                    model2: @relation(name: "RelationName1")[]
                }
    
                type Model2 @model {
                    name: String
                    model1: @relation(name="RelationName2")
                }
            `),
            ).toThrowError(`Line: 4 Relation 'RelationName1' doesn't have mate`)
        })

        it('relation recursion is not allowed', async () => {
            expect(() =>
                getModelsFromSchema(`
                type Model1 @model {
                    name: String
                    model2: @relation(name: "RelationName1")[]
                    model1: @relation(name="RelationName1")
                }
    
                type Model2 @model {
                    name: String
                   
                }
            `),
            ).toThrowError(
                `Line: 4 Relation with name 'RelationName1' have recursion to the same model 'Model1' on line: 5. Relation have to be a connection between two models`,
            )
        })

        it('relation to many connections', async () => {
            expect(() =>
                getModelsFromSchema(`
                type Model1 @model {
                    name: String
                    model2: @relation(name: "RelationName1")[]
                    model1: @relation(name="RelationName1")
                }
    
                type Model2 @model {
                    name: String
                    model1: @relation(name="RelationName1")
                }
            `),
            ).toThrowError(
                `Line: 4 To many relation with name 'RelationName1' on lines: 4, 5, 10 expecting only two mates`,
            )
        })

        it('array with required relation is not supported', async () => {
            const models = await getModelsFromSchema(`
                type Model1 @model {
                    name: String
                    model2: @relation(name="Model1OnModel2")[]!
                }
    
                type Model2 @model {
                    name: String
                    model1: @relation("Model1OnModel2")
                }
            `)
            expect(models.length).toEqual(5)
            expect(models[0].modelName).toEqual('Model1')
            expect(models[0].members[1]).toHaveProperty('isRequired', false)
            expect(models[0].members[1].relation.error).toEqual(
                `Line 4: Relation array field 'model2' with name 'Model1OnModel2' can't be required! Only required relations to ONE are supported`,
            )
            expect(models[1].modelName).toEqual('Model2')
        })

        it('relation all good', async () => {
            const models = await getModelsFromSchema(`
                type Model1 @model {
                    name: String @isUnique
                    model2: @relation("Model1OnModel2")[]
                }
    
                type Model2 @model {
                    name: String
                    model1: @relation(name="Model1OnModel2")!
                }
            `)
            expect(models.length).toEqual(5)
            expect(models[0].modelName).toEqual('Model1')
            expect(models[0].members[1].relation.error).not.toBeDefined()
            expect(models[0].members[1]).toHaveProperty('isArray', true)
            expect(models[0].members[1]).toHaveProperty('isRequired', false)
            expect(models[0].members[1].relation).toHaveProperty('relatedModel', models[1])
            expect(models[0].members[1].relation).toHaveProperty('relatedMember', models[1].members[1])
            expect(models[1].modelName).toEqual('Model2')
            expect(models[1].members[1]).toHaveProperty('isArray', false)
            expect(models[1].members[1]).toHaveProperty('isRequired', true)
            expect(models[1].members[1].relation).toHaveProperty('relatedModel', models[0])
            expect(models[1].members[1].relation).toHaveProperty('relatedMember', models[0].members[1])
        })

        it('relation in entity', async () => {
            expect(() =>
                getModelsFromSchema(`
                type Model1 @model {
                    name: String
                    model2: @relation(name: "RelationName1")[]
                }
    
                type Entity1 @entity {
                    name: String
                    model1: @relation(name="RelationName1")
                }
            `),
            ).toThrowError(
                `Line 9: Entity with name 'Entity1' have a full relation 'RelationName1' what is not possible`,
            )
        })
    })

    describe('entities', () => {
        it('connection a entity', async () => {
            const models = await getModelsFromSchema(`
                type Model1 @model {
                    name: String @isUnique
                    entity1: Entity1[]
                }
    
                type Entity1 @entity {
                    name: String
                }
            `)
            expect(models.length).toEqual(5)
            expect(models[0].modelName).toEqual('Model1')
            expect(models[0].members[1].relation.error).not.toBeDefined()
            expect(models[0].members[1]).toHaveProperty('isArray', true)
            expect(models[0].members[1]).toHaveProperty('isRequired', false)
            expect(models[0].members[1].relation).toHaveProperty('relatedModel', models[1])
            expect(models[0].members[1].relation).toHaveProperty('relatedMember', null)
            expect(models[1].modelName).toEqual('Entity1')
        })
    })

    describe('extractMemberFromLine', () => {
        it('required unique', () => {
            const member = extractMemberFromLine('name1: String! @isUnique', 10)
            expect(member).toHaveProperty('name', 'name1')
            expect(member).toHaveProperty('type', 'String')
            expect(member).toHaveProperty('modelName', 'String')
            expect(member).toHaveProperty('isUnique', true)
            expect(member).toHaveProperty('isRequired', true)
            expect(member).toHaveProperty('isArray', false)
        })

        it('required array', () => {
            const member = extractMemberFromLine('name2: String[]!', 1)
            expect(member).toHaveProperty('name', 'name2')
            expect(member).toHaveProperty('type', 'String')
            expect(member).toHaveProperty('modelName', 'String')
            expect(member).toHaveProperty('isUnique', false)
            expect(member).toHaveProperty('isRequired', true)
            expect(member).toHaveProperty('isArray', true)
        })

        it('not required array', () => {
            const member = extractMemberFromLine('name3: Int[]', 1)
            expect(member).toHaveProperty('name', 'name3')
            expect(member).toHaveProperty('type', 'Int')
            expect(member).toHaveProperty('modelName', 'Int')
            expect(member).toHaveProperty('isUnique', false)
            expect(member).toHaveProperty('isRequired', false)
            expect(member).toHaveProperty('isArray', true)
        })

        it('relation shortcat', () => {
            const member = extractMemberFromLine('rel1: @relation("relationName1")', 1)
            expect(member).toHaveProperty('name', 'rel1')
            expect(member).toHaveProperty('type', '@relation("relationName1")')
            expect(member).toHaveProperty('modelName', null)
            expect(member).toHaveProperty('isUnique', false)
            expect(member).toHaveProperty('isRequired', false)
            expect(member).toHaveProperty('isArray', false)
            expect(member).toHaveProperty('relation.name', 'relationName1')
            expect(member).toHaveProperty('relation.type', 'RELATION')
        })
        it('relation name=', () => {
            const member = extractMemberFromLine('rel2: @relation(name="relationName2")', 1)
            expect(member).toHaveProperty('name', 'rel2')
            expect(member).toHaveProperty('type', '@relation(name="relationName2")')
            expect(member).toHaveProperty('modelName', null)
            expect(member).toHaveProperty('isUnique', false)
            expect(member).toHaveProperty('isRequired', false)
            expect(member).toHaveProperty('isArray', false)
            expect(member).toHaveProperty('relation.name', 'relationName2')
            expect(member).toHaveProperty('relation.type', 'RELATION')
        })
        it('relation name:', () => {
            const member = extractMemberFromLine('rel3: @relation(name:"relationName3")[]', 1)
            expect(member).toHaveProperty('name', 'rel3')
            expect(member).toHaveProperty('type', '@relation(name:"relationName3")')
            expect(member).toHaveProperty('modelName', null)
            expect(member).toHaveProperty('isUnique', false)
            expect(member).toHaveProperty('isRequired', false)
            expect(member).toHaveProperty('isArray', true)
            expect(member).toHaveProperty('relation.name', 'relationName3')
            expect(member).toHaveProperty('relation.type', 'RELATION')
        })
    })
})
