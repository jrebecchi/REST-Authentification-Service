const mongoose = require('mongoose');
const jwt = require('jsonwebtoken')
const Schema = mongoose.Schema;
const PasswordEncryption = require('../service/crypto/PasswordEncryption')
const TOKEN_LENGTH = 64;
const TOKEN_EXPIRATION = 31 * 24 * 60 * 60 * 1000;
const {
    UserNotFound,
    WrongPasswordError,
    WrongTokenError
} = require('../service/error/ErrorTypes');

const User = new Schema({
    username: String,
    email: String,
    password: String,
    passwordSalt: String,
    emailConfirmed: { type: Boolean, default: false },
    emailConfirmationCode: String,
    updatePasswordToken: String,
    passwordUpdateRequestDate: Date,
    extras: Object,
    token: String,
    tokenExpires: Number
});

User.statics.userExists = function (filter) {
    return this.findOne(filter)
        .then((result) => !!result);
};

User.statics.getUser = function (filter) {
    return this.findOne(filter)
        .then(user => {
            if (user == null) {
                throw new UserNotFound();
            }
            return user;
        });
};

User.statics.createUser = function (data) {
    let UserModel = mongoose.model('user', User);
    let user = new UserModel();
    return PasswordEncryption.hashAndSalt(data.password)
        .then((results) => {
            user.username = data.username;
            user.email = data.email;
            user.password = results.hash;
            user.passwordSalt = results.salt;
            user.extras = data.extras;
            return user.save();
        }, (err) => {
            throw new Error("Password encryption failed :" + err)
        });
};

User.statics.resetPassword = function (filter, password) {
    return PasswordEncryption.hashAndSalt(password)
        .then((results) => {
            let data = {
                password: results.hash,
                passwordSalt: results.salt
            };
            return this.updateOne(filter, data);
        }, (err) => {
            throw new Error("Password encryption failed :" + err)
        });
};

User.statics.isPasswordValid = function (filter, password) {
    let user;
    return this.getUser(filter)
        .then(userFound => {
            user = userFound;
            return PasswordEncryption.hash(password, user.passwordSalt);
        })
        .then(results => {
            return results.hash === user.password;
        });
}

User.statics.authenticate = function (filter, password, privateKey) {
    return this.isPasswordValid(filter, password)
        .then(isPasswordValid => {
            if (isPasswordValid) {
                return this.getUser(filter);
            } else {
                throw new WrongPasswordError()
            }
        })
        .then((user) => new Promise((resolve) => {
            jwt.sign(user, privateKey, { algorithm: 'RS256' }, (err, token) => {
                if (err) {
                    throw new WrongTokenError(e);
                } else {
                    resolve(token);
                }
            });
        }));
};

User.statics.isAuthentified = function (token, publicKey) {
    return new Promise((resolve) => {
        jwt.verify(token, publicKey, { algorithm: 'RS256' }, (err, user) => {
            if (err) {
                throw new WrongTokenError(e)
            } else {
                resolve(user)
            }
        });
    });
};

User.statics.updateUser = function (filter, data) {
    return this.updateOne(filter, data);
};

User.statics.removeUser = function (filter) {
    return this.deleteOne(filter);
};

module.exports = mongoose.model('user', User);