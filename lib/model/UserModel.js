const mongoose = require('mongoose');
const jwt = require('jsonwebtoken')
const Schema = mongoose.Schema;
const PasswordEncryption = require('../service/crypto/PasswordEncryption')
const {
    UserNotFound,
    WrongPasswordError,
    WrongTokenError,
} = require('../service/error/ErrorTypes');

const basicSchema = {
    username: String,
    email: String,
    password: String,
    passwordSalt: String,
    emailConfirmed: { type: Boolean, default: false },
    emailConfirmationCode: String,
    updatePasswordToken: String,
    passwordUpdateRequestDate: Date,
    extras: Object,
};

const filterAndFormatUserInfos = (user) => {
    return {
        id: user.id,
        ...user.extras,
        email: user.email,
        username: user.username,
        emailConfirmed: user.emailConfirmed
    }
}

const computeUserToken = (user, privateKey) => {
    return new Promise((resolve, reject) => {
        jwt.sign(JSON.stringify(user), privateKey, { algorithm: 'RS256' }, async (err, token) => {
            if (err) {
                reject(new WrongTokenError(err.message));;
            } else {
                resolve(token);
            }
        });
    });
}

let User;

module.exports = (fields) => {
    if (User === undefined) {

        User = new Schema({
            ...basicSchema,
            ...fields
        });

        User.statics.userExists = function (filter) {
            return this.findOne(filter)
                .then((result) => !!result);
        };

        User.statics.getUser = function (filter) {
            return this.findOne(filter)
                .then(user => {
                    if (user == null) {
                        throw new UserNotFound('User not found!');
                    }
                    let formattedUser = Object.assign(user, user.extras);
                    delete formattedUser.extras;
                    return formattedUser;
                });
        };

        User.statics.getUserPublicInfos = function (filter) {
            return this.findOne(filter).select("-password -passwordSalt -emailConfirmationCode -updatePasswordToken -passwordUpdateRequestDate")
                .then(user => {
                    if (user == null) {
                        throw new UserNotFound('User not found!');
                    }
                    return filterAndFormatUserInfos(user);
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
                    user.emailConfirmationCode = data.emailConfirmationCode;
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

        User.statics.sign = async function (filter, password, privateKey) {
            const isPasswordValid = await this.isPasswordValid(filter, password);
            if (!isPasswordValid) throw new WrongPasswordError('Wrong credentials!')
            const user = await this.getUserPublicInfos(filter);
            const token = await computeUserToken(user, privateKey);
            return { user, token };
        };

        User.statics.updateToken = async function (filter, privateKey) {
            const user = await this.getUserPublicInfos(filter);
            const token = await computeUserToken(user, privateKey);
            return { token, user }
        }

        User.statics.verify = function (token, publicKey) {
            return new Promise((resolve, reject) => {
                jwt.verify(token, publicKey, { algorithm: 'RS256' }, async (err, userDecrypted) => {
                    if (err) {
                        reject(new WrongTokenError('Please log in!'));
                    } else {
                        resolve(userDecrypted)
                    }
                });
            });
        };

        User.statics.updateUser = async function (filter, data) {
            if (data.password) {
                try {
                    const results = await PasswordEncryption.hashAndSalt(data.password);
                    data = {
                        ...data,
                        password: results.hash,
                        passwordSalt: results.salt
                    };
                } catch (err) {
                    throw new Error("Password encryption failed :" + err);
                }
            }
            await this.updateOne(filter, data);
        };

        User.statics.removeUser = function (filter) {
            return this.deleteOne(filter);
        };
    }

    return mongoose.model('user', User);
}

module.exports.init = (fields) => module.exports(fields);