
import {
  getModelsFromSchema,
  extractMemberFromLine,
} from '../parser/scan';

import {
  generateInputParamsForMutationModel,
  generateSchemaInputs,
  genereateSchemaModelPayloads,
  generateMutationAddingsAndRemovings,
  cleanApplayedRelations,
} from './generators/schema';


const importedModelFileForSchema = `
type File @model {
  contentType: String!
  createdAt: DateTime!
  id: ID! @isUnique
  name: String!
  secret: String! @isUnique
  size: Int!
  updatedAt: DateTime!
  url: String! @isUnique
}
`;

const importedModelTodoItemForSchema = `
type TodoItem @model {
  completed: Boolean! @defaultValue(value: false)
  createdAt: DateTime!
  id: ID! @isUnique
  title: String!
  user: User @relation(name: "TodoItemOnUser")
  images: [ImageTodoItem!] @relation(name: "ImageTodoItemOnTodoItem")
}
`;

const importedModelImageTodoItemForSchema = `
type ImageTodoItem @model {
  createdAt: DateTime!
  id: ID! @isUnique
  url: String!
  todo: TodoItem @relation(name: "ImageTodoItemOnTodoItem")
}
`;

const importedModelUserForSchema = `
type User @model {
  createdAt: DateTime!
  id: ID! @isUnique
  updatedAt: DateTime!
  todoItems: [TodoItem!]! @relation(name: "TodoItemOnUser")
  email: String @isUnique
  password: String
  student: User @relation(name: "StudentOnUser")
}
`;

const importedModelStudentForSchema = `
type Student @model {
  createdAt: DateTime!
  id: ID! @isUnique
  updatedAt: DateTime!

  user: User @relation(name: "StudentOnUser")
  classes: [Class!]! @relation(name: "ClassOnStudent")
  fullname: String! @isUnique
  age: Int
}
`;

const importedModelClassForSchema = `
type Class @model {
  createdAt: DateTime!
  id: ID! @isUnique
  updatedAt: DateTime!
  students: [Student!] @relation(name: "ClassOnStudent")
  name: String! @isUnique
}
`;

const importedSchema = `
${importedModelFileForSchema}

${importedModelTodoItemForSchema}

${importedModelUserForSchema}

${importedModelImageTodoItemForSchema}
${importedModelClassForSchema}
${importedModelStudentForSchema}

`;

const testLinesTest1 = [
  ['updatedAt: DateTime', 'updatedAt', 'DateTime'],
  ['contentType: String', 'contentType', 'String'],
  ['size: Int', 'size', 'Int'],
];

describe('Schema Export', () => {
  it('get models from schema', async () => {

    const models = await getModelsFromSchema(importedSchema);

    expect(models.length).toEqual(6);
  });

  describe('inputs',  () => {
    it('student have two imputs', async () => {
      const models = await getModelsFromSchema(`
      ${importedModelClassForSchema}
      ${importedModelStudentForSchema}
      ${importedModelUserForSchema}
      `);
      const result = generateSchemaInputs([models[0],models[1]]);

      // tslint:disable-next-line:max-line-length
      expect(result).toEqual(`input ClassstudentsStudent {
userId: ID, fullname: String!, age: Int
}
input StudentclassesClass {
name: String!
}

`);
    });
  });
  describe('mutations', () => {
    it('todo item have userId: ID instad user: User', async () => {
      const models = await getModelsFromSchema(importedSchema);
      const result = generateInputParamsForMutationModel(models[1]);

      // tslint:disable-next-line:max-line-length
      expect(result).toEqual('completed: Boolean, title: String, userId: ID, imagesIds: [ID!], images: [TodoItemimagesImageTodoItem!]');
    });

    it('todo item have todoItemsId: [ID!] instad of todoItemsId: ID', async () => {
      const models = await getModelsFromSchema(importedSchema);
      const result = generateInputParamsForMutationModel(models[2]);

      // tslint:disable-next-line:max-line-length
      expect(result).toEqual('todoItemsIds: [ID!], todoItems: [UsertodoItemsTodoItem!], email: String, password: String, studentId: ID');
    });

    it('todo item have todoItemsId: [ID!] instad of todoItemsId: ID', async () => {
      const models = await getModelsFromSchema(importedSchema);
      const result = generateInputParamsForMutationModel(models[2], { includeId: true });

      // tslint:disable-next-line:max-line-length
      expect(result).toEqual('id: ID!, todoItemsIds: [ID!], todoItems: [UsertodoItemsTodoItem!], email: String, password: String, studentId: ID');
    });

    it('todo item have todoItemsId: [ID!] instad of todoItemsId: ID', async () => {
      const models = await getModelsFromSchema(importedSchema);
      const result = generateInputParamsForMutationModel(models[1], { excludeRelationToModel: 'ImageTodoItem' });

      // tslint:disable-next-line:max-line-length
      expect(result).toEqual('completed: Boolean, title: String, userId: ID');
    });
 
    it('todo item have payloads for Add and Remove', async () => {
      cleanApplayedRelations();
      const models = await getModelsFromSchema(importedSchema);
      const result = genereateSchemaModelPayloads(models[1]);

      // tslint:disable-next-line:max-line-length
      expect(result).toMatchSnapshot();
    });
  });

  describe('get line', () => {
    it('not required', async () => {
      for (const tl of testLinesTest1) {
        const member = extractMemberFromLine(tl[0], 0);
        expect(member.name).toEqual(tl[1]);
        expect(member.type).toEqual(tl[2]);
        expect(member.isRequired).toBeFalsy();
        expect(member.isUnique).toBeFalsy();
      }
    });

    it('required', async () => {
      for (const tl of testLinesTest1) {
        const member = extractMemberFromLine(tl[0] + '!', 0);
        expect(member.name).toEqual(tl[1]);
        expect(member.type).toEqual(tl[2]);
        expect(member.isRequired).toBeTruthy();
        expect(member.isUnique).toBeFalsy();
      }
    });


    it('isUnique and required', async () => {
      for (const tl of testLinesTest1) {
        const member = extractMemberFromLine('id: ID! @isUnique', 0);
        expect(member.name).toEqual('id');
        expect(member.type).toEqual('ID');
        expect(member.isRequired).toBeTruthy();
        expect(member.isUnique).toBeTruthy();
      }
    });

    it('@relation multi to one', async () => {
      for (const tl of testLinesTest1) {
        const member = extractMemberFromLine('todoItems: [TodoItem!]! @relation(name: "TodoItemOnUser")', 0);
        expect(member.name).toEqual('todoItems');
        expect(member.type).toEqual('[TodoItem!]');
        expect(member.relation).toHaveProperty('name');
        expect(member.relation.name).toEqual('TodoItemOnUser');
        expect(member.isRequired).toBeTruthy();
        expect(member.isUnique).toBeFalsy();
      }
    });

    it('@relation one to multi', async () => {
      for (const tl of testLinesTest1) {
        const member = extractMemberFromLine('user: User @relation(name: "TodoItemOnUser")', 0);
        expect(member.name).toEqual('user');
        expect(member.type).toEqual('User');
        expect(member.relation).toHaveProperty('name');
        expect(member.relation.name).toEqual('TodoItemOnUser');
        expect(member.isRequired).toBeFalsy();
        expect(member.isUnique).toBeFalsy();
      }
    });

    it('@relation one to multi', async () => {
      for (const tl of testLinesTest1) {
        const member = extractMemberFromLine('images: [ImageTodoItem!] @relation(name: "ImageTodoItemOnTodoItem")', 0);
        expect(member.name).toEqual('images');
        expect(member.type).toEqual('[ImageTodoItem!]');
        expect(member.relation).toHaveProperty('name');
        expect(member.relation.name).toEqual('ImageTodoItemOnTodoItem');
        expect(member.isRequired).toBeFalsy();
        expect(member.isUnique).toBeFalsy();
      }
    });

  });
  
});
