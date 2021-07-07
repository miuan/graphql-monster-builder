# Optain Token

1. [Admin Playground](#entity)
1. [Login existing user](#entity)
1. [Register new user](#model)
1. [Add (admin) role to user](#fields)
1. [Refresh token](#fields)
1. [How to use token](#fields)

# Admin Playground

In project list, is a button Admin Playground from where you can do all operations with admin role. For example list of all users

### Project with Admin Playground button

![alt admin playground button](/documentation/admin-playground-button.png)

### Admin Playground

![alt admin playground](/documentation/admin-playground.png)

### All user query

```
{allUser{id, email, roles{id, name}}}
```

```
{
  "data": {
    "allUser": [
      {
        "id": "60d976d791e6c6769608b52f",
        "email": my@account.com",
        "roles": [
          {
            "id": "60d976d791e6c6769608b52d",
            "name": "admin"
          }
        ]
      },
    ]
  }
}
```

# Login existing user

After create new project, your email and password is recreated also into your new project.
So with your creadentials you can login to your project and you can optain a token with admin role.
Unfortunately that is not possible if you are login to graphql.monster with 3party github, facebook,

### admin playground

```
mutation {login_v1(email:"my@account.com", password:"*****"){token, refreshToken, user{id, roles{id, name}}}}
```

### curl

```
curl -XPOST -H "Content-type: application/json" -d '{"operationName":null,"variables":{},"query":"mutation {\n  login_v1(email: \"new@user.com\", password: \"wery-heavy-password-341!\") {\n    token\n    refreshToken\n    user {\n      id\n      roles {\n        id\n        name\n      }\n    }\n  }\n}\n"}' 'https://graphql.monster/client/<replace-with-your-userid>/project/<replace-with-your-projectid>/graphql'
```

### example response

```
// example of response
  "data": {
    "login_v1": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwZTM1Y2U5OWZiNDAxMjJkYjY1OWRkZSIsInJvbGVzIjpbIjYwZDk3NmQ3OTFlNmM2NzY5NjA4YjUyZCJdLCJpYXQiOjE2MjU1MTM0NjEsImV4cCI6MTYyNTUxNzA2MX0.K0p4WY2lcqf8lrUPJda_JAQLmU1IFxZpbjY8OpqAHcA",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwZTM1Y2U5OWZiNDAxMjJkYjY1OWRkZSIsImlhdCI6MTYyNTUxMzQ2MSwiZXhwIjoxNjU3MDQ5NDYxfQ.X6dN0S_-dROBUTguLhx-xMjIQimdrZXfYjQQF11EohI",
      "user": {
        "id": "60d976d791e6c6769608b52f",
        "roles": [
          {
            "id": "60d976d791e6c6769608b52d",
            "name": "admin"
          }
        ]
      }
    }
  }
}
```

# Register new user

### admin playground

```
mutation {register_v1(email:"new@user.com", password:"*****"){token, refreshToken,user{id,email,roles{id,name}}}}
```

### curl

```
curl -XPOST -H "Content-type: application/json" -d '{"operationName":null,"variables":{},"query":"mutation {\n  register_v1(email: \"new@user.com\", password: \"wery-heavy-password-341!\") {\n    token\n    refreshToken\n    user {\n      id\n      roles {\n        id\n        name\n      }\n    }\n  }\n}\n"}' 'https://graphql.monster/client/<replace-with-your-userid>/project/<replace-with-your-projectid>/graphql'
```

### example response

```
{
  "data": {
    "register_v1": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwZTM1Y2U5OWZiNDAxMjJkYjY1OWRkZSIsInJvbGVzIjpbXSwiaWF0IjoxNjI1NTEzMTkzLCJleHAiOjE2MjU1MTY3OTN9.2mLjKOyvUiFc-TyNFVeeV2ilcFTjaCb2KxM5x7el_SY",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwZTM1Y2U5OWZiNDAxMjJkYjY1OWRkZSIsImlhdCI6MTYyNTUxMzE5MywiZXhwIjoxNjU3MDQ5MTkzfQ.IQnYUq7-Ww1SOlmJk6tkvy_n6ex6-2ZHs6sFZNi538g",
      "user": {
        "id": "60e35ce99fb40122db659dde",
        "email": "new@user.com",
        "roles": []
      }
    }
  }
}
```

now you can try even login with this new user, the result will be very similar

```
mutation {login_v1(email:"new@user.com", password:"*****"){token, refreshToken,user{id,email,roles{id,name}}}}
```

# Add (admin) role to user

you can add Admin role to any user

```
mutation{addRoleToUser(userId:"60e35ce99fb40122db659dde", userRoleId:"60d976d791e6c6769608b52d"){
  user{id, email, roles{id, name}}
  userRole{name}
}}
```

# Remove (admin) role from user

there is a limitation, you can't remove admin from yourself.

```
mutation{removeRoleFromUser(userId:"60e35ce99fb40122db659dde", userRoleId:"60d976d791e6c6769608b52d"){
  user{id, email, roles{id, name}}
  userRole{name}
}}
```

# How to use token

token should be part of `Authorization` header together with `Bearer` keyword

```
curl -XPOST -H 'Authorization: Bearer eyJhbGciOiJIUzI1iNIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwMjY1YTJjYjY0OTllNmJlNjliMTNiNiIsInJvbGVzIjpbXSwiaWF0IjoxNjI1NTEyNDQyLCJleHAiOjE2MjU1MTYwNDJ9.UlLKJKyZw-WykECixHqV_ZtURgLVDBwwFB62-HmbeKE' -H "Content-type: application/json" -d '{"operationName":null,"variables":{},"query":"{\n  allUser {\n    id\n    email\n    roles {\n      id\n      name\n    }\n  }\n  allUserRole {\n    id\n    name\n  }\n}\n"}' 'https://graphql.monster/client/<your-userid>/project/<your-projectid>/graphql'
```

# Refresh token

Token is limited for one hour, but you can optain new token with `refreshToken` key together with new `refreshToken`

### admin playground

```
mutation{
    refreshToken_v1(
        token:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwZTM1Y2U5OWZiNDAxMjJkYjY1OWRkZSIsInJvbGVzIjpbIjYwZDk3NmQ3OTFlNmM2NzY5NjA4YjUyZCJdLCJpYXQiOjE2MjU1MTUwNzMsImV4cCI6MTYyNTUxODY3M30.uUkDwFknQd0GzLDW0V12ZBGhAXozmNZlGm06EQGm-SM",
        refreshToken:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwZTM1Y2U5OWZiNDAxMjJkYjY1OWRkZSIsImlhdCI6MTYyNTUxNTA3MywiZXhwIjoxNjU3MDUxMDczfQ._6_5gdQ4sxDXhsabQuHSbqISMHbaI629bSYpX5w_1mY",
        userId:"60e35ce99fb40122db659dde"){
            token,
            refreshToken
            }
        }
```

### curl

```
curl -XPOST -H 'Authorization: Bearer eyJhbGciOiJIUzI1iNIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwMjY1YTJjYjY0OTllNmJlNjliMTNiNiIsInJvbGVzIjpbXSwiaWF0IjoxNjI1NTEyNDQyLCJleHAiOjE2MjU1MTYwNDJ9.UlLKJKyZw-WykECixHqV_ZtURgLVDBwwFB62-HmbeKE' -H "Content-type: application/json" -d 'mutation{
    refreshToken_v1(
        token:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwZTM1Y2U5OWZiNDAxMjJkYjY1OWRkZSIsInJvbGVzIjpbIjYwZDk3NmQ3OTFlNmM2NzY5NjA4YjUyZCJdLCJpYXQiOjE2MjU1MTUwNzMsImV4cCI6MTYyNTUxODY3M30.uUkDwFknQd0GzLDW0V12ZBGhAXozmNZlGm06EQGm-SM",
        refreshToken:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwZTM1Y2U5OWZiNDAxMjJkYjY1OWRkZSIsImlhdCI6MTYyNTUxNTA3MywiZXhwIjoxNjU3MDUxMDczfQ._6_5gdQ4sxDXhsabQuHSbqISMHbaI629bSYpX5w_1mY",
        userId:"60e35ce99fb40122db659dde"){
            token,
            refreshToken
            }
        }' 'https://graphql.monster/client/<your-userid>/project/<your-projectid>/graphql'
```

### example result

```
{
  "data": {
    "refreshToken_v1": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwZTM1Y2U5OWZiNDAxMjJkYjY1OWRkZSIsInJvbGVzIjpbXSwiaWF0IjoxNjI1NTE1OTkzLCJleHAiOjE2MjU1MTk1OTN9.E3K1tiUPgtt5irHCV-HrBJbwzWQdyKkwd_uzCT2jaXs",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYwZTM1Y2U5OWZiNDAxMjJkYjY1OWRkZSIsImlhdCI6MTYyNTUxNTk5MywiZXhwIjoxNjU3MDUxOTkzfQ.w1wMzkoVfgyY_gPWL0LfTk1mFbX0wguK2etT8_D3GfI"
    }
  }
}
```
