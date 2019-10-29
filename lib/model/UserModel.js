const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('../config')
const Schema = mongoose.Schema;
const PasswordEncryption = require('../service/crypto/PasswordEncryption')
const {
    UserNotFound,
    WrongPasswordError,
    WrongTokenError,
} = require('../service/error/ErrorTypes');

const basicSchema = {
    username: {
        type: String,
        required: true,
        unique: true,
        maxlength: 128,
        validate: {
            validator: v => /^[a-zA-Z0-9\-_.]{4,}$/.test(v),
            message: props => {
                if (props.value < 4) return "The username must contains more than 4 characters!";
                else return "A username may only contain letters, numbers, dashes, dots and underscores !";
            }
        },
    },
    email: {
        type: String,
        required: true,
        unique: true,
        maxlength: 256,
        validate: {
            validator: v => /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(v),
            message: () => "This email address is not valid!",
        }
    },
    password: {
        type: String,
        required: true,
    },
    passwordSalt: {
        type: String,
        required: true,
    },
    verified: {
        type: Boolean,
        required: true,
        default: false,
    },
    verificationToken: String,
    passwordRecoveryToken: String,
    passwordRecoveryRequestDate: Date,
};

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

let schema = {
    ...basicSchema,
    ...config.extendedSchema
}

if (!config.hasUsername) delete schema['username']

const User = new Schema(schema);

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
            return user;
        });
};

User.statics.getUserPublicInfos = function (filter) {
    return this.findOne(filter).select("-password -passwordSalt -verificationToken -passwordRecoveryToken -passwordRecoveryRequestDate -__v").lean()
        .then(user => {
            if (user == null) {
                throw new UserNotFound('User not found!');
            }
            user.id = user._id;
            delete user._id;
            return user;
        });
};

User.statics.createUser = function (data) {
    let UserModel = new mongoose.model('user', User);
    return PasswordEncryption.hashAndSalt(data.password)
        .then((results) => {
            let user = new UserModel();
            Object.keys(data).map(prop => {
                if (data !== "password") user[prop] = data[prop];
            });
            user.password = results.hash;
            user.passwordSalt = results.salt;
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

module.exports = mongoose.model('user', User);