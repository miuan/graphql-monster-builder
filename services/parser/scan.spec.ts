import { jsonWithoutCircularStructure } from '../backend/integration-tests/utils'
import { SchemaModelMember, SYSTEM_MODELS, SYSTEM_TYPES } from '../common/types'
import { setupRelationLinkNames } from './relations'
import { getModelsFromSchema, extractMemberFromLine } from './scan'

describe('scan', () => {
    it('add default models in empty schema', async () => {
        const models = await getModelsFromSchema(``)
        expect(models.length).toEqual(3)

        expect(models[0].modelName).toEqual('File')
        expect(models[1].modelName).toEqual('User')
        expect(models[2].modelName).toEqual('UserRole')

        const file = models.find((model) => model.modelName === 'File')
        expect(file).not.toBeNull()

        const fileName = file.members.find((member) => member.name === 'name')
        expect(fileName).not.toBeUndefined()
        expect(fileName).toHaveProperty('isArray', false)
        expect(fileName).toHaveProperty('isVirtual', false)
        expect(fileName).toHaveProperty('isReadonly', false)
        expect(fileName).toHaveProperty('isRequired', true)
        expect(fileName).toHaveProperty('isSystem', true)

        const fileType = file.members.find((member) => member.name === 'type')
        expect(fileType).not.toBeUndefined()
        expect(fileType).toHaveProperty('isArray', false)
        expect(fileType).toHaveProperty('isVirtual', false)
        expect(fileType).toHaveProperty('isReadonly', false)
        expect(fileType).toHaveProperty('isRequired', true)
        expect(fileName).toHaveProperty('isSystem', true)
        expect(fileType).toHaveProperty('default', 'text/plain')

        const fileSize = file.members.find((member) => member.name === 'size')
        expect(fileSize).not.toBeUndefined()
        expect(fileSize).toHaveProperty('isArray', false)
        expect(fileSize).toHaveProperty('isVirtual', false)
        expect(fileSize).toHaveProperty('isReadonly', true)
        expect(fileSize).toHaveProperty('isRequired', true)
        expect(fileName).toHaveProperty('isSystem', true)

        const filePublicKey = file.members.find((member) => member.name === 'publicKey')
        expect(filePublicKey).not.toBeUndefined()
        expect(filePublicKey).toHaveProperty('isArray', false)
        expect(filePublicKey).toHaveProperty('isVirtual', false)
        expect(filePublicKey).toHaveProperty('isUnique', true)
        expect(filePublicKey).toHaveProperty('isReadonly', true)
        expect(filePublicKey).toHaveProperty('isRequired', true)
        expect(fileName).toHaveProperty('isSystem', true)

        const fileDatas = file.members.filter((member) => member.name === 'data')
        expect(fileDatas).toHaveLength(1)
        const fileData = fileDatas[0]
        expect(fileData).not.toBeUndefined()
        expect(fileData).toHaveProperty('isArray', false)
        expect(fileData).toHaveProperty('isVirtual', true)
        expect(fileData).toHaveProperty('isReadonly', false)
        expect(fileData).toHaveProperty('isRequired', true)
        expect(fileName).toHaveProperty('isSystem', true)

        const user = models.find((model) => model.modelName === 'User')
        expect(user).not.toBeNull()

        const userEmail = user.members.find((member) => member.name === 'email')
        expect(userEmail).not.toBeUndefined()
        expect(userEmail).toHaveProperty('type', 'String')
        expect(userEmail).toHaveProperty('isArray', false)
        expect(userEmail).toHaveProperty('isVirtual', false)
        expect(userEmail).toHaveProperty('isReadonly', true)
        expect(userEmail).toHaveProperty('isRequired', true)
        expect(fileName).toHaveProperty('isSystem', true)

        const userVerified = user.members.find((member) => member.name === 'verified')
        expect(userVerified).not.toBeUndefined()
        expect(userVerified).toHaveProperty('type', 'Boolean')
        expect(userVerified).toHaveProperty('isArray', false)
        expect(userVerified).toHaveProperty('isVirtual', false)
        expect(userVerified).toHaveProperty('isReadonly', true)
        expect(userVerified).toHaveProperty('isRequired', false)
        expect(fileName).toHaveProperty('isSystem', true)

        const userPassword = user.members.find((member) => member.name === 'password')
        expect(userPassword).not.toBeUndefined()
        expect(userPassword).toHaveProperty('type', 'String')
        expect(userPassword).toHaveProperty('isArray', false)
        expect(userPassword).toHaveProperty('isVirtual', false)
        expect(userPassword).toHaveProperty('isReadonly', true)
        expect(userPassword).toHaveProperty('isRequired', true)
        expect(fileName).toHaveProperty('isSystem', true)

        const userFiles = user.members.find((member) => member.name === 'files')
        expect(userFiles).not.toBeUndefined()
        expect(userFiles).toHaveProperty('type', '[File]')
        expect(userFiles).toHaveProperty('isArray', true)
        expect(userFiles).toHaveProperty('isVirtual', false)
        expect(userFiles).toHaveProperty('isReadonly', false)
        expect(userFiles).toHaveProperty('isRequired', false)
        expect(fileName).toHaveProperty('isSystem', true)
    })

    describe('model and entities', () => {
        it.each(SYSTEM_TYPES)('should fail with model name %s', async (type) => {
            const regExp = new RegExp(`The model name '${type}' what colides with system scalar type '${type}'`)
            expect(() =>
                getModelsFromSchema(`
                type ${type} @model {
                    name: String! @isUnique
                }
        `),
            ).toThrowError(regExp)
        })

        it.each(['email', 'password', 'verified', 'roles', 'files', 'createdAt', 'updatedAt'])('should fail, because user model have fiels name "%s" reserved', async (fieldName) => {
            expect(() =>
                getModelsFromSchema(`
                type User @model {
                    ${fieldName}: DateTime
                }
        `),
            ).toThrowError(/as reserved and will be added automatically/)
        })

        it('model have reserved member with name id', async () => {
            expect(() =>
                getModelsFromSchema(`
                type Model1 @model {
                    id: ID,
                    name: String! @isUnique
                }
        `),
            ).toThrowError(/have member with name `id` that is reserved/)
        })

        it('model have reserved member with name user', async () => {
            expect(() =>
                getModelsFromSchema(`
                type Model1 @model {
                    user: String,
                    name: String! @isUnique
                }
        `),
            ).toThrowError(/have member with name `user` that is reserved/)
        })

        it('user model have reserved members with connected models myModel1s', async () => {
            expect(() =>
                getModelsFromSchema(`
                type Model1 @model {
                    name: String! @isUnique
                }

                type User @model {
                    _model1: String
                }
        `),
            ).toThrowError(/Field name: _model1 is reserved as automatic generated connection UserModel with Model1Model/)

            expect(() =>
                getModelsFromSchema(`
                type Model2 @model {
                    name: String! @isUnique
                }

                type User @model {
                    _model1: String
                }
        `),
            ).not.toThrowError(/Field name: _model1 is reserved as automatic generated connection UserModel with Model1Model/)
        })

        it.each(['email', 'password', 'verified', 'files'])('user model have reserved member name %s', async (member) => {
            expect(() =>
                getModelsFromSchema(`
                type User @model {
                    ${member}: String
                }
        `),
            ).toThrowError(/User have these fields names/)
        })

        it('type Model1 @model {...', async () => {
            const models = await getModelsFromSchema(`
                type Model1 @model {
                    name: String! @isUnique
                }
            `)

            // const models = jsonWithoutCircularStructure(modelsRaw)
            expect(models.length).toEqual(4)
            const model1 = models.find((m) => m?.modelName == 'Model1')
            expect(model1).toHaveProperty('modelName', 'Model1')
            expect(model1).toHaveProperty('type', 'MODEL')
            const model1FieldNanme = model1.members.find((m) => m?.name == 'name')
            expect(model1FieldNanme).toHaveProperty('isArray', false)
            expect(model1FieldNanme).toHaveProperty('isVirtual', false)
            expect(model1FieldNanme).toHaveProperty('isRequired', true)

            // automaticaly added fields
            expect(model1.members).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'createdAt', isUnique: false, type: 'DateTime' })]))
            expect(model1.members).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'updatedAt', isUnique: false, type: 'DateTime' })]))
            expect(model1.members).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'id', isUnique: true, type: 'ID' })]))

            // circular ...
            // expect(model1.members).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'user', isUnique: true, type: 'User' })]))
            const userRelation = model1.members.find((m) => m?.name == 'user')
            expect(userRelation).toHaveProperty('type', 'User')
            expect(userRelation).toHaveProperty('isArray', false)
            expect(userRelation).toHaveProperty('isUnique', false)
            expect(userRelation).toHaveProperty('isRequired', false)
            expect(userRelation).toHaveProperty('relation.name', '_Model1OnUser')
            expect(userRelation).toHaveProperty('relation.payloadNameForId', 'userId')

            const userModel = models.find((m) => m?.modelName == 'User')
            expect(userModel).toHaveProperty('modelName', 'User')
            expect(userModel).toHaveProperty('type', 'MODEL')
            const userModel1Relation = userModel.members.find((m) => m?.name == '_model1')
            expect(userModel1Relation).toHaveProperty('type', '[Model1]')
            expect(userModel1Relation).toHaveProperty('isArray', true)
            expect(userModel1Relation).toHaveProperty('isUnique', false)
            expect(userModel1Relation).toHaveProperty('isRequired', false)
            expect(userModel1Relation).toHaveProperty('relation.name', '_Model1OnUser')

            const userFile = userModel.members.find((m) => m?.name == '_file')
            expect(userFile).toBeUndefined()

            const userUser = userModel.members.find((m) => m?.name == '_user')
            expect(userUser).toBeUndefined()

            const userRole = userModel.members.find((m) => m?.name == '_userRole')
            expect(userRole).toBeUndefined()
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
            expect(model1.members[0]).toHaveProperty('isVirtual', false)
            expect(model1.members[0]).toHaveProperty('isRequired', true)

            // NOT automaticaly added ID
            expect(model1.members).toEqual(expect.not.arrayContaining([expect.objectContaining({ name: 'id', isUnique: true, type: 'ID' })]))
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
            const model1FieldName = models[1].members.find((m) => m?.name == 'name')
            expect(model1FieldName).toHaveProperty('isArray', false)
            expect(model1FieldName).toHaveProperty('isVirtual', false)
            expect(model1FieldName).toHaveProperty('isRequired', true)

            // automaticaly added ID
            expect(model1.members).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'id', isUnique: true, type: 'ID' })]))
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
            expect(model1.members[0]).toHaveProperty('isVirtual', false)
            expect(model1.members[0]).toHaveProperty('isRequired', true)
            expect(model1.members[0]).toHaveProperty('isHidden', false)

            // NOT automaticaly added ID
            expect(model1.members).toEqual(expect.not.arrayContaining([expect.objectContaining({ name: 'id', isUnique: true, type: 'ID' })]))
        })

        it('entity Model1 have hidden member because is prefixed with _', async () => {
            const models = await getModelsFromSchema(`
            entity Model1 {
                    _name: String! @isUnique
                }
            `)
            expect(models.length).toEqual(4)
            const model1 = models.find((m) => m.modelName == 'Model1')
            expect(model1).toHaveProperty('modelName', 'Model1')
            expect(model1).toHaveProperty('type', 'ENTITY')
            expect(model1.members[0]).toHaveProperty('isArray', false)
            expect(model1.members[0]).toHaveProperty('isVirtual', false)
            expect(model1.members[0]).toHaveProperty('isRequired', true)
            expect(model1.members[0]).toHaveProperty('isHidden', true)

            // NOT automaticaly added ID
            expect(model1.members).toEqual(expect.not.arrayContaining([expect.objectContaining({ name: 'id', isUnique: true, type: 'ID' })]))
        })
    })

    describe('relations', () => {
        it('Model have only relations and any scalar type', async () => {
            expect(() =>
                getModelsFromSchema(`
                type Model1 @model {
                    model2:  [@relation(name: "RelationName1")]
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
                    model2: [@relation(name: "RelationName1")]
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
                    model2: [@relation(name: "RelationName1")]
                    model1: @relation(name="RelationName1")
                }
    
                type Model2 @model {
                    name: String
                   
                }
            `),
            ).toThrowError(`Line: 4 Relation with name 'RelationName1' have recursion to the same model 'Model1' on line: 5. Relation have to be a connection between two models`)
        })

        it('relation to many connections', async () => {
            expect(() =>
                getModelsFromSchema(`
                type Model1 @model {
                    name: String
                    model2: [@relation(name: "RelationName1")]
                    model1: @relation(name="RelationName1")
                }
    
                type Model2 @model {
                    name: String
                    model1: @relation(name="RelationName1")
                }
            `),
            ).toThrowError(`Line: 4 To many relation with name 'RelationName1' on lines: 4, 5, 10 expecting only two mates`)
        })

        it('array with required relation is not supported', async () => {
            const models = await getModelsFromSchema(`
                type Model1 @model {
                    name: String
                    model2: [@relation(name="Model1OnModel2")]!
                }
    
                type Model2 @model {
                    name: String
                    model1: @relation("Model1OnModel2")
                }
            `)
            expect(models.length).toEqual(5)
            expect(models[1].modelName).toEqual('Model1')
            const model1FieldModel2 = models[1].members.find((m) => m?.name == 'model2')
            expect(model1FieldModel2).toHaveProperty('isRequired', false)
            expect(model1FieldModel2.relation.error).toEqual(`Line 4: Relation array field 'model2' with name 'Model1OnModel2' can't be required! Only required relations to ONE are supported`)
            expect(model1FieldModel2.modelName).toEqual('Model2')
        })

        it('array with required relation is not supported', async () => {
            expect(() =>
                getModelsFromSchema(`
                type Model1 @model {
                    name: String
                    model2: [Model2] @relation(name: "Model1OnModel2")
                }
    
                type Model2 @model {
                    name: String
                    model1: Model1! @relation(name: "Model1OnModel2")
                }`),
            ).toThrowError(`Line: 4: unknown param '@relation(name: \"Model1OnModel2\")'`)
        })

        it('relation all good', async () => {
            const models = await getModelsFromSchema(`
                type Model1 @model {
                    name: String @isUnique
                    model2: [@relation("Model1ToModel2")]
                }
    
                type Model2 @model {
                    name: String
                    model1: @relation(name="Model1ToModel2")!
                }
            `)
            expect(models.length).toEqual(5)
            expect(models[1].modelName).toEqual('Model1')
            const model1FieldModel2 = models[1].members.find((m) => m?.name == 'model2')
            expect(model1FieldModel2.relation.error).not.toBeDefined()
            expect(model1FieldModel2).toHaveProperty('isArray', true)
            expect(model1FieldModel2).toHaveProperty('isRequired', false)
            expect(model1FieldModel2).toHaveProperty('relation')
            const model1OnModel2 = model1FieldModel2.relation
            const model2FieldModel1 = models[2].members.find((m) => m?.name == 'model1')

            expect(model1OnModel2).toHaveProperty('relatedModel', models[2])
            expect(model1OnModel2).toHaveProperty('relatedMember', model2FieldModel1)

            expect(model1OnModel2).toHaveProperty('linkNames.isSystem', false)
            expect(model1OnModel2).toHaveProperty('linkNames.linkName', 'linkModel1ToModel2')
            expect(model1OnModel2).toHaveProperty('linkNames.unlinkName', 'unlinkModel1FromModel2')
            expect(model1OnModel2).toHaveProperty('linkNames.relationName', 'Model1ToModel2')
            expect(model1OnModel2).toHaveProperty('linkNames.param1', 'model1Id')
            expect(model1OnModel2).toHaveProperty('linkNames.param2', 'model2Id')
            expect(model1OnModel2).toHaveProperty('linkNames.res1', 'model1')
            expect(model1OnModel2).toHaveProperty('linkNames.res2', 'model2')

            expect(models[2].modelName).toEqual('Model2')

            expect(model2FieldModel1).toHaveProperty('isArray', false)
            expect(model2FieldModel1).toHaveProperty('isRequired', true)
            expect(model2FieldModel1.relation).toHaveProperty('relatedModel', models[1])
            expect(model2FieldModel1.relation).toHaveProperty('relatedMember', model1FieldModel2)
            expect(model2FieldModel1.relation).not.toHaveProperty('linkNames')

            const modelUser = models[3]
            const modelUserRole = models[4]
            const userMemberRoles = models[3].members.find((m) => m.name === 'roles')
            const userRolesMemberUsers = models[4].members.find((m) => m.name === 'users')
            expect(userMemberRoles).toBeDefined()
            expect(userMemberRoles).toHaveProperty('relation')
            expect(userMemberRoles).toHaveProperty('relation.relatedModel', modelUserRole)
            expect(userMemberRoles.relation).toHaveProperty('linkNames.isSystem', true)
            expect(userMemberRoles.relation).toHaveProperty('linkNames.linkName', 'addRoleToUser')
            expect(userMemberRoles.relation).toHaveProperty('linkNames.unlinkName', 'removeRoleFromUser')
            expect(userMemberRoles.relation).toHaveProperty('linkNames.relationName', 'RoleToUser')
            expect(userMemberRoles.relation).toHaveProperty('linkNames.param1', 'userId')
            expect(userMemberRoles.relation).toHaveProperty('linkNames.param2', 'userRoleId')
            expect(userMemberRoles.relation).toHaveProperty('linkNames.res1', 'user')
            expect(userMemberRoles.relation).toHaveProperty('linkNames.res2', 'userRole')

            expect(userRolesMemberUsers).toBeDefined()
            expect(userRolesMemberUsers).toHaveProperty('relation')
            expect(userRolesMemberUsers).toHaveProperty('relation.relatedModel', modelUser)
            expect(userRolesMemberUsers.relation).not.toHaveProperty('linkNames')
        })

        it('relation in entity', async () => {
            expect(() =>
                getModelsFromSchema(`
                type Model1 @model {
                    name: String
                    model2: [@relation(name: "RelationName1")]
                }
    
                type Entity1 @entity {
                    name: String
                    model1: @relation(name="RelationName1")
                }
            `),
            ).toThrowError(`Line 9: Entity with name 'Entity1' have a full relation 'RelationName1' what is not possible`)
        })
    })

    describe('entities', () => {
        it('connection a entity', async () => {
            const models = await getModelsFromSchema(`
                type Model1 @model {
                    name: String @isUnique
                    entity1: [Entity1]
                }
    
                type Entity1 @entity {
                    name: String
                }
            `)
            expect(models.length).toEqual(5)
            expect(models[2].modelName).toEqual('Model1')

            const model1FieldEntity1 = models[2].members.find((m) => m?.name == 'entity1')
            expect(model1FieldEntity1.relation.error).not.toBeDefined()
            expect(model1FieldEntity1).toHaveProperty('isArray', true)
            expect(model1FieldEntity1).toHaveProperty('isRequired', false)
            expect(model1FieldEntity1.relation).toHaveProperty('relatedModel', models[0])
            expect(model1FieldEntity1.relation).toHaveProperty('relatedMember', null)
            expect(models[0].modelName).toEqual('Entity1')
        })
    })

    describe('extractMemberFromLine', () => {
        it.each(['@unique', '@isUnique'])('required because mark as %s', (required) => {
            const member = extractMemberFromLine(`name1: String! ${required}`, 10)
            expect(member).toHaveProperty('name', 'name1')
            expect(member).toHaveProperty('type', 'String')
            expect(member).toHaveProperty('modelName', 'String')
            expect(member).toHaveProperty('isUnique', true)
            expect(member).toHaveProperty('isRequired', true)
            expect(member).toHaveProperty('isArray', false)
            expect(member).toHaveProperty('isVirtual', false)
        })

        it('required array', () => {
            const member = extractMemberFromLine('name2: [String]!', 1)
            expect(member).toHaveProperty('name', 'name2')
            expect(member).toHaveProperty('type', 'String')
            expect(member).toHaveProperty('modelName', 'String')
            expect(member).toHaveProperty('isUnique', false)
            expect(member).toHaveProperty('isRequired', true)
            expect(member).toHaveProperty('isArray', true)
            expect(member).toHaveProperty('isVirtual', false)
        })

        it('not required array', () => {
            const member = extractMemberFromLine('name3: [Int]', 1)
            expect(member).toHaveProperty('name', 'name3')
            expect(member).toHaveProperty('type', 'Int')
            expect(member).toHaveProperty('modelName', 'Int')
            expect(member).toHaveProperty('isUnique', false)
            expect(member).toHaveProperty('isRequired', false)
            expect(member).toHaveProperty('isArray', true)
            expect(member).toHaveProperty('isVirtual', false)
        })

        it('relation shortcat', () => {
            const member = extractMemberFromLine('rel1: @relation("relationName1")', 1)
            expect(member).toHaveProperty('name', 'rel1')
            expect(member).toHaveProperty('type', '@relation("relationName1")')
            expect(member).toHaveProperty('modelName', null)
            expect(member).toHaveProperty('isUnique', false)
            expect(member).toHaveProperty('isRequired', false)
            expect(member).toHaveProperty('isArray', false)
            expect(member).toHaveProperty('isVirtual', false)
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
            expect(member).toHaveProperty('isVirtual', false)
            expect(member).toHaveProperty('relation.name', 'relationName2')
            expect(member).toHaveProperty('relation.type', 'RELATION')
        })
        it('relation name:', () => {
            const member = extractMemberFromLine('rel3: [@relation(name:"relationName3")]', 1)
            expect(member).toHaveProperty('name', 'rel3')
            expect(member).toHaveProperty('type', '@relation(name:"relationName3")')
            expect(member).toHaveProperty('modelName', null)
            expect(member).toHaveProperty('isUnique', false)
            expect(member).toHaveProperty('isRequired', false)
            expect(member).toHaveProperty('isArray', true)
            expect(member).toHaveProperty('isVirtual', false)
            expect(member).toHaveProperty('relation.name', 'relationName3')
            expect(member).toHaveProperty('relation.type', 'RELATION')
        })

        it('string virtual', () => {
            const member = extractMemberFromLine('name1: String @isVirtual', 10)
            expect(member).toHaveProperty('name', 'name1')
            expect(member).toHaveProperty('type', 'String')
            expect(member).toHaveProperty('modelName', 'String')

            expect(member).toHaveProperty('isArray', false)
            expect(member).toHaveProperty('isUnique', false)
            expect(member).toHaveProperty('isVirtual', true)
            expect(member).toHaveProperty('isRequired', false)
        })

        it('array string virtual', () => {
            const member = extractMemberFromLine('name1: [String] @isVirtual', 10)
            expect(member).toHaveProperty('name', 'name1')
            expect(member).toHaveProperty('type', 'String')
            expect(member).toHaveProperty('modelName', 'String')
            expect(member).toHaveProperty('isArray', true)
            expect(member).toHaveProperty('isUnique', false)
            expect(member).toHaveProperty('isVirtual', true)
            expect(member).toHaveProperty('isRequired', false)
        })

        it('default text', () => {
            const member = extractMemberFromLine('defMember1: String! @default("def member value")', 10)
            expect(member).toHaveProperty('name', 'defMember1')
            expect(member).toHaveProperty('type', 'String')
            expect(member).toHaveProperty('modelName', 'String')
            expect(member).toHaveProperty('isArray', false)
            expect(member).toHaveProperty('isUnique', false)
            expect(member).toHaveProperty('isVirtual', false)
            expect(member).toHaveProperty('isRequired', true)
            expect(member).toHaveProperty('default', 'def member value')
        })

        it('default text array', () => {
            expect(() => extractMemberFromLine('defMember2: [String] @default("def member value")', 1)).toThrowError(/modificator @default is not suitable for members with array type/)
        })

        it('default text into Int', () => {
            expect(() => extractMemberFromLine('defMember3: Int @default("def member value")', 1)).toThrowError(/modificator @default contain a text, but member with name 'defMember3' is type 'Int'/)
        })

        it('default number 123 (Int)', () => {
            const member = extractMemberFromLine('defMember1: Int @default(123)', 10)
            expect(member).toHaveProperty('name', 'defMember1')
            expect(member).toHaveProperty('type', 'Int')
            expect(member).toHaveProperty('modelName', 'Int')
            expect(member).toHaveProperty('isArray', false)
            expect(member).toHaveProperty('isUnique', false)
            expect(member).toHaveProperty('isVirtual', false)
            expect(member).toHaveProperty('isRequired', false)
            expect(member).toHaveProperty('default', 123)
        })

        it('default number 123 (Float)', () => {
            const member = extractMemberFromLine('defMember2: Float! @default(123)', 10)
            expect(member).toHaveProperty('name', 'defMember2')
            expect(member).toHaveProperty('type', 'Float')
            expect(member).toHaveProperty('modelName', 'Float')
            expect(member).toHaveProperty('isArray', false)
            expect(member).toHaveProperty('isUnique', false)
            expect(member).toHaveProperty('isVirtual', false)
            expect(member).toHaveProperty('isRequired', true)
            expect(member).toHaveProperty('default', 123)
        })

        it('default number 123 array', () => {
            expect(() => extractMemberFromLine('defMember2: [Int] @default(123)', 1)).toThrowError(/modificator @default is not suitable for members with array type/)
        })

        it('default text into Int', () => {
            expect(() => extractMemberFromLine('defMember3: String @default(123)', 1)).toThrowError(/modificator @default contain a number, but member with name 'defMember3' is type 'String'/)
        })

        it('default boolean (false)', () => {
            const member = extractMemberFromLine('defMember3: Boolean! @default(false)', 10)
            expect(member).toHaveProperty('name', 'defMember3')
            expect(member).toHaveProperty('type', 'Boolean')
            expect(member).toHaveProperty('modelName', 'Boolean')
            expect(member).toHaveProperty('isArray', false)
            expect(member).toHaveProperty('isUnique', false)
            expect(member).toHaveProperty('isVirtual', false)
            expect(member).toHaveProperty('isRequired', true)
            expect(member).toHaveProperty('default', false)
        })

        it('default boolean (true)', () => {
            const member = extractMemberFromLine('defMember3: Boolean! @default(true)', 10)
            expect(member).toHaveProperty('name', 'defMember3')
            expect(member).toHaveProperty('type', 'Boolean')
            expect(member).toHaveProperty('modelName', 'Boolean')
            expect(member).toHaveProperty('isArray', false)
            expect(member).toHaveProperty('isUnique', false)
            expect(member).toHaveProperty('isVirtual', false)
            expect(member).toHaveProperty('isRequired', true)
            expect(member).toHaveProperty('default', true)
        })

        it('default boolean array', () => {
            expect(() => extractMemberFromLine('defMember2: [Boolean] @default(false)', 1)).toThrowError(/modificator @default is not suitable for members with array type/)
        })

        it('default boolean false into Int', () => {
            expect(() => extractMemberFromLine('defMember3: String @default(false)', 1)).toThrowError(
                /modificator @default contain a boolean value, but member with name 'defMember3' is type 'String'/,
            )
        })

        it('should have regexp', () => {
            const member = extractMemberFromLine('name: String! @regExp("[A-Za-z]{3,2}")', 10)
            expect(member).toHaveProperty('name', 'name')
            expect(member).toHaveProperty('type', 'String')
            expect(member).toHaveProperty('modelName', 'String')
            expect(member).toHaveProperty('isUnique', false)
            expect(member).toHaveProperty('isRequired', true)
            expect(member).toHaveProperty('isArray', false)
            expect(member).toHaveProperty('isVirtual', false)
            expect(member).toHaveProperty('regExp', '[A-Za-z]{3,2}')
        })

        it('should not have regexp because is not a string', () => {
            expect(() => extractMemberFromLine('name: Int @regExp("[A-Za-z]{3,2}")', 1)).toThrowError(/RegExp validation can't be combined with another type than 'String'/)
        })

        it.each(['@hidden', '@isHidden'])('hidden because mark as %s', (required) => {
            const member = extractMemberFromLine(`name1: String! ${required}`, 10)
            expect(member).toHaveProperty('name', 'name1')
            expect(member).toHaveProperty('type', 'String')
            expect(member).toHaveProperty('modelName', 'String')
            expect(member).toHaveProperty('isUnique', false)
            expect(member).toHaveProperty('isRequired', true)
            expect(member).toHaveProperty('isArray', false)
            expect(member).toHaveProperty('isVirtual', false)
            expect(member).toHaveProperty('isHidden', true)
        })
    })

    describe('setupRelationLinkNames', () => {
        it('_UserRoleToUser (system)', () => {
            const linkNames = setupRelationLinkNames({
                relation: { name: '_UserRoleToUser', relatedModel: { modelName: 'UserRole' }, relatedMember: { relation: { relatedModel: { modelName: 'User' } } } },
            } as SchemaModelMember)
            expect(linkNames).toHaveProperty('relationName', 'UserRoleToUser')
            expect(linkNames).toHaveProperty('linkName', 'addUserRoleToUser')
            expect(linkNames).toHaveProperty('unlinkName', 'removeUserRoleFromUser')
            expect(linkNames).toHaveProperty('param1', 'userId')
            expect(linkNames).toHaveProperty('param2', 'userRoleId')
            expect(linkNames).toHaveProperty('res1', 'user')
            expect(linkNames).toHaveProperty('res2', 'userRole')
        })

        it('Model1ToModel2 (normal)', () => {
            const linkNames = setupRelationLinkNames({
                relation: { name: 'Model1ToModel2', relatedModel: { modelName: 'Model2' }, relatedMember: { relation: { relatedModel: { modelName: 'Model1' } } } },
            } as SchemaModelMember)
            expect(linkNames).toHaveProperty('relationName', 'Model1ToModel2')
            expect(linkNames).toHaveProperty('linkName', 'linkModel1ToModel2')
            expect(linkNames).toHaveProperty('unlinkName', 'unlinkModel1FromModel2')
            expect(linkNames).toHaveProperty('param1', 'model1Id')
            expect(linkNames).toHaveProperty('param2', 'model2Id')
            expect(linkNames).toHaveProperty('res1', 'model1')
            expect(linkNames).toHaveProperty('res2', 'model2')
        })
    })
})
