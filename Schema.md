# Menu

1. [Model](#model)
1. [Entity](#entity)
1. [Fields](#fields)
1. [Relations](#relations)
1. [Model Permissions](#model-permissions)

# Model

Types are similar of types in graphql [https://graphql.org/learn/schema/](https://graphql.org/learn/schema/). Model should start with capital letter like "**Todo**" and should have taged with reserved word **@model**

```
type Todo @model {
    name: String!
    done: Boolean!
}
```

**Todo** is a GraphQL Object Type, meaning it's a type with some fields. For ProtectQL meaning is a model.
**name** and **done** are fields on the Character type. That means that name and done are the only fields that can appear in any part of a GraphQL query that operates on the Todo model/type.

**String** is one of the built-in scalar types - these are types that resolve to a single scalar object, and can't have sub-selections in the query. We'll go over scalar types more later.

**String!** means that the field is non-nullable, meaning that the GraphQL service promises to always give you a value when you query this field. In the type language, we'll represent those with an exclamation mark.

## Default Models

### User

Model User is predefined and contain some main fields what is not possible change or rename `email`, `password`, `verified`, `roles`. Whole model looks like:

```
type User @model {
    email: String! @isReadonly
    password: String! @isReadonly
    verified: Boolean @isReadonly
    roles: @relation("RoleOnUser")[]
}
```

But you can extend these fields by defining new ones

```
type User @model {
    firstName: String
    lastName: String
    # the other fields like email, password, verified and roles
    # are not present in model definition but fully accessible by GraphQL query
}
```

### UserRole

This model you can't modify or extend, but is look like this

```
type UserRole @model {
  role: String @isUnique
  users: @relation("RoleOnUser")[]
}
```

# Entity

Entity should start with capital letter like "**Todo**" and should have taged with reserved word **@entity**. Entity doesn't have a id, so is not possible create, update or list it from graphql. Entity have to be part of object. Also can't have a relation to another model. Lets have `Address`

```
type Address @entity {
    name: String!
    street: String!
    city: String!
}
```

now we can map entity to Todo

```
type Invoice @model {
    customer: Address
    seller: Address
    totalPrice: Float
}
```

or even we can map entity as array

```
type InvoiceItem @entity {
    name: String!
    count: Int!
    price: float!
}

type Invoice @model {
    items: InvoiceItem[]
    customer: Address
    seller: Address
    totalPrice: Float
}
```

Share one entity accross multiple models is also not problem

# Fields

## Defining own fields

Each model have members. Member have two parts `name` and `scalar type`. Name should start with regular character like a-z or cappital A-Z

```
field: String # possible
Field: String # possible
field123: String # possible
field_123: String # possible

123field: String # not possible
_field: String # not possible

emit1: String # possible
emit: String # not possible is reserved
```

### Field reserved names

-   id
-   on
-   emit
-   \_events
-   db
-   get
-   set
-   init
-   isNew
-   errors
-   schema
-   options
-   modelName
-   collection
-   \_pres
-   \_posts
-   toObject

## Field scalar types

| Syntax  | Description                                                                                                                                                                                                                                                |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**  | The ID scalar type represents a unique identifier, often used to refetch an object or as the key for a cache. The ID type is serialized in the same way as a String; however, defining it as an ID signifies that it is not intended to be human‐readable. |
| String  | A UTF‐8 character sequence                                                                                                                                                                                                                                 |
| Boolean | **true** or **false**.                                                                                                                                                                                                                                     |
| Int     | A signed 32‐bit integer                                                                                                                                                                                                                                    |
| Float   | A signed double-precision floating-point value                                                                                                                                                                                                             |
| Date    | objects represent a single moment in time in a platform-independent format.                                                                                                                                                                                |

## Arrays

Each field can be described as array

```
field1: String[] # this field is array of strings
field2: Int[] # this field is array of numbers
field3: Boolean[] # this field is array of boolens
field4: Date[] # this field is array of dates
```

## Field modificators

| Syntax      | Description                                                                  |
| ----------- | ---------------------------------------------------------------------------- |
| !           | mark field as mandatory (default is optional)                                |
| @isReadonly | Object can be set only when is created                                       |
| @isUnique   | Field is unique                                                              |
| @relation   | A special type descriptive the object is actualy relations to another object |
| @default    | describe default field value                                                 |
| @virtual    | field marked as virtual is not in database                                   |
| @regExp     | field is conditional by regexpresion                                         |

### Examples

```
field1: String                         # this field is optional for creation and posible change in edit
field2: String!                        # this field is mandatory for creation and posible change in edit
field3: String @isReadonly             # this field is posible setup in creation but not posible change in edit
field4: String! @isReadonly            # this field you need setup in creation but not posible change in edit
field5: String @isUnique               # this field is unique
field6: String @isUnique               # this field is mandatory and unique
field7: String @isUnique @isReadonly   # this field is optional, unique and readolny
field8: String! @isUnique @isReadonly  # this field is mandatory, unique and readonly
field9: String @default("hello")       # this field is optional, but the default value will be "hello"
```

### Unique can be combination of multiple fields

Is unique modificator can have parameter to specify fields combination. For example if you want unique field value for one user, but another user can also have same value but just once

```
type Todo @model {
 name: String! @isUnique(combinationWith:"user")
 user: User @relation(name: "TodoOnUser")
}

```

# Relations

Each model can be connected to another model with following relations

-   one to one
-   many to one
-   one to many
-   many to many

## modificator

```
field: @releation(name: "relation-name")
```

First the releation field have to be a same type as connected object. Also must be mark with @relation modificator. Relation modificator have parameter name what describe unique key to recognize connection on booth sides.

## one to one - example

One user will have one Todo

```
type Todo @model {
 user: @relation(name: "TodoOnUser")
}

type User @model {
 todo: @relation(name: "TodoOnUser")
}
```

## one to many - example

One user will have multiple Todos

```
type Todo @model {
 user: @relation(name: "TodoOnUser")
}

type User @model {
 todo: @relation(name: "TodoOnUser")[]
}
```

## many to many - example

One Users can have multiple Todos what can be related to multiple Users

```
type Todo @model {
 user: @relation(name: "TodoOnUser")[]
}

type User @model {
 todo: @relation(name: "TodoOnUser")[]
}
```

## More relation to different object - example

```
type Todo @model {
 user: @relation(name: "TodoOnUser")
}

type Project @model {
 user: @relation(name: "ProjectOnUser")
}

type User @model {
 todo: @relation(name: "TodoOnUser")[]
 project: @relation(name: "ProjectOnUser")[]
}
```

## Required relations

Relatations can be required, but not array relations. Array relations will be automaticaly set as not required

### Required relations example

Here is a example Todo what have required relation to User model, in this case you can't create a Todo without a user

```
type Todo @model {
 user: @relation(name: "TodoOnUser")!
}

type User @model {
 todo: @relation(name: "TodoOnUser")[]
}
```

In another way this relation with required list of user are not possible and will automaticaly set to `user: @relation(name: "TodoOnUser")[]` (not required list of User)

```
type Todo @model {
 user: @relation(name: "TodoOnUser")[]!
}

type User @model {
 todo: @relation(name: "TodoOnUser")[]
}
```

# Model Permissions

Echa model can have described his own permissions for each operation

| Action  | Description                              |
| ------- | ---------------------------------------- |
| @one    | permission about read one model by ID    |
| @all    | permission about read all models         |
| @create | permission about create a model          |
| @update | permission about update a existing model |
| @delete | permission about delete a existing model |

| Tag values | Description                             |
| ---------- | --------------------------------------- |
| public     | anybody can do the action               |
| user       | any loged user can do the action        |
| owner      | only owner of a model                   |
| role       | only user who is sign to a role (group) |
| filter     | only if the filter are aplied           |

Lets take a look on our first model Todo

```
# @create(role:"admin") - these are default invisible setting
# @one(role:"admin") @update(role:"admin") @remove(role:"admin") - these are default invisible setting
# @all(role:"admin") - these are default invisible setting
type Todo @model {
    name: String!
    done: Boolean!
}
```

by default is every operation sign only for admin, but we can add some setting

```
@create("user")
@one("owner") @update("owner") @remove("owner")
@all(filter:"user_every.id={{userId}}")
type Todo @model {
    name: String!
    done: Boolean!
}
```

Now the model can be created by any loged user, get one, update or delete, can only user who created this object. And last but also important see all objects is possible only with `user_every.id` filter applied thats mean, user can see only his own models.

Note: admin still keeps all the roles, and can anything

## Another role

You can add another role for example `TodosRole` what you can add some user who will have this priviledge, then you can add this role to permision to do some actions

```
@create("user")
@one("owner") @update("owner") @remove("owner")
@all(filter:"user_every.id={{userId}}")
@all(role:"TodosRole") # we add some extra permisions for TodosRole
type Todo @model {
    name: String!
    done: Boolean!
}
```

now all the objects of Todo can see also a user who is sign to TodosRole
