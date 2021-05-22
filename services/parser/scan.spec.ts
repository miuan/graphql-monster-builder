
import {
    getModelsFromSchema,
    extractMemberFromLine,
  } from './scan';
  
  describe('scan', () => {
    it('add default models in empty schema', async () => {
        const models = await getModelsFromSchema(``);
        expect(models.length).toEqual(2);

        expect(models[0].modelName).toEqual('User');
        expect(models[1].modelName).toEqual('UserRole');
    });


    it('relation not have a mate', async () => {
        expect(()=>getModelsFromSchema(`
            type Model1 @model {
                model2: [Model2]! @relation(name: "RelationName1")
            }

            type Model2 @model {
                model1: Model1! @relation(name: "RelationName2")
            }
        `)).toThrowError(`Line: 3 Relation 'RelationName1' doesn't have mate`);
    
    });

    it('array with required relation is not supported', async () => {
        const models = await getModelsFromSchema(`
            type Model1 @model {
                model2: [Model2]! @relation(name: "Model1OnModel2")
            }

            type Model2 @model {
                model1: Model1! @relation(name: "Model1OnModel2")
            }
        `);
        expect(models.length).toEqual(4);
        expect(models[0].modelName).toEqual('Model1');
        expect(models[0].members[0].relation.error).toEqual(`Line 3: Array field 'model2' with relation to Model2 (as many) can't be required! Only required relations to ONE are supported`);
        expect(models[1].modelName).toEqual('Model2');
    });

    it('array with without required relation is supported', async () => {
        const models = await getModelsFromSchema(`
            type Model1 @model {
                model2: [Model2] @relation(name: "Model1OnModel2")
            }

            type Model2 @model {
                model1: Model1! @relation(name: "Model1OnModel2")
            }
        `);
        expect(models.length).toEqual(4);
        expect(models[0].modelName).toEqual('Model1');
        expect(models[0].members[0].relation.error).not.toBeDefined();
        expect(models[1].modelName).toEqual('Model2');
    });
    
  });
  