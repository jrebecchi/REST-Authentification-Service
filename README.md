# REST-Authentification
A REST back-end to handle login, registration, access control and password recovery with JsonWebToken


### Test wether an email address is available or already used  
```bash
localhost:5000/email-exists?email=myemail@host.com

````
```js
//Email available
{ "isEmailAvailable": true }
//Email already registered in data base
{ "isEmailAvailable": false }
//wrong email
{
    "notifications": [
        { "type": "error", "message": "This email adress is not valid!" }
    ]
}
```