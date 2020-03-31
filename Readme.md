
# GraphQL server builder

## build
```
yarn build --backend examples/project.schema my-server
```

## run

```
cd my-server/ && yarn && yarn start
```

### create login as admin user

```curl
curl --request POST \
  --url http://localhost:3001/entry/graphql \
  --header 'content-type: application/json' \
  --data '{"query":"{\n  login(email: \"admin\", password: \"admin\") {\n    token\n    id\n  }\n}\n"}'
```