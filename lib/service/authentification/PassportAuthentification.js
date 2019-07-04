const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const User = require('../../model/UserModel');
const {
    WrongLoginError,
    UserNotFound
} = require('../error/ErrorTypes');


module.exports.init = function(){
    // Configure the local strategy for use by Passport.
    // The local strategy require a `verify` function which receives the credentials
    // (`username` and `password`) submitted by the user.  The function must verify
    // that the password is correct and then invoke `cb` with a user object, which
    // will be set at `req.user` in route handlers after authentication.
    passport.use(new Strategy(
        function(login, password, cb) {
            let emailFound;
            let usernameFound;
            User.userExists({email: login})
            .then(emailExists => {
                emailFound = emailExists;
                return User.userExists({username: login});
            })
            .then(usernameExists => {
                usernameFound = usernameExists;
                if (emailFound)
                    return User.authenticate({email: login}, password)
                else if (usernameFound)
                    return User.authenticate({username: login}, password)
                else 
                    throw new WrongLoginError();
            })
            .then(user => {
                return cb(null, user);
            })
            .catch(e => {
                return cb(null, false);
            });
        })
    );

    // Configure Passport authenticated session persistence.
    //
    // In order to restore authentication state across HTTP requests, Passport needs
    // to serialize users into and deserialize users out of the session.  The
    // typical implementation of this is as simple as supplying the user ID when
    // serializing, and querying the user record by ID from the database when
    // deserializing.
    passport.serializeUser(function(user, cb) {
        User.userExists({username: user.username})
        .then(userExists => {
            if (!userExists)
                throw new UserNotFound();
            return User.getUser({username: user.username})
        })
        .then(userFound => {
            return cb(null, userFound.token);
        })
        .catch(err => {
            return cb(err, null);
        })
    });

    passport.deserializeUser(function(token, cb) {
        User.userExists({token: token})
        .then(userExists => {
            if (!userExists)
                throw new UserNotFound();
            return User.getUser({token: token})
        })
        .then(user => {
            return cb(null, user);
        })
        .catch(err => {
            return cb(err, null);
        })
    });
};