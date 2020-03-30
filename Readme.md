
# GraphQL server builder

## build
```
yarn build --backend examples/project.schema my-server
```

## run

```
cd my-server/ && yarn && yarn start
```

### create admin user

```
mutation {
  createUser(email:"admin@my-server.com", password:"admin", roles: {role:"admin"}) {id, token, roles{role, id}}
}
```