

# Model

Types are similar of types in graphql [https://graphql.org/learn/schema/](https://graphql.org/learn/schema/). Model should start with capital letter like "__Todo__" and should have taged with reserved word __@model__

```
type Todo @model {
    name: String!
    done: Boolean!
}
```

 __Todo__ is a GraphQL Object Type, meaning it's a type with some fields. For ProtectQL meaning is a model.
__name__ and __done__ are fields on the Character type. That means that name and done are the only fields that can appear in any part of a GraphQL query that operates on the Todo model/type.

 __String__ is one of the built-in scalar types - these are types that resolve to a single scalar object, and can't have sub-selections in the query. We'll go over scalar types more later.

__String!__ means that the field is non-nullable, meaning that the GraphQL service promises to always give you a value when you query this field. In the type language, we'll represent those with an exclamation mark.

## Default Models

### User

Model User is predefined and contain some main fields what is not possible change or rename `email`, `password`, `verified`, `roles`. Whole model looks like:
```
type User @model {
    email: String! @isReadonly
    password: String! @isReadonly
    verified: Boolean @isReadonly
    roles: [UserRole] @relation(name: "RoleOnUser")
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

Model user role looks like, this model you can anyhow modify or extend

```
type UserRole @model {
  role: String @isUnique
  users: [User] @relation(name: "RoleOnUser")
}
```

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

- id
- on
- emit
- _events
- db
- get
- set
- init
- isNew
- errors
- schema
- options
- modelName
- collection
- _pres
- _posts
- toObject


## Field scalar types

| Syntax      | Description |
| ----------- | ----------- |
| __ID__      |  The ID scalar type represents a unique identifier, often used to refetch an object or as the key for a cache. The ID type is serialized in the same way as a String; however, defining it as an ID signifies that it is not intended to be human‐readable.       |
| String      | A UTF‐8 character sequence       |
| Boolean     | __true__ or __false__.        |
| Number     | A signed 32‐bit integer or A signed double-precision floating-point value        |
| Date     | objects represent a single moment in time in a platform-independent format.        |

## Field modificators

| Syntax      | Description |
| ----------- | ----------- |
| !     | mark field as mandatory (default is optional)       |
| @isReadonly      |  Object can be set only when is created       |
| @isUnique      | Field is unique       |
| @relation     | A special type descriptive the object is actualy relations to another object      |

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
