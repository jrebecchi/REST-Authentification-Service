const mongoose = require('mongoose');
const crypto = require('crypto');
const Schema = mongoose.Schema;
const PasswordEncryption = require('../service/crypto/PasswordEncryption')
const TOKEN_LENGTH = 64;
const TOKEN_EXPIRATION = 31 * 24 * 60 * 60 * 1000;
const {
    UserNotFound,
    WrongPasswordError,
} = require('../service/error/ErrorTypes');

const User = new Schema({
    username: String,
    email: String,
    password: String,
    passwordSalt: String,
    emailConfirmed: {type: Boolean, default: false },
    emailConfirmationCode:   String,
    updatePasswordToken: String,
    passwordUpdateRequestDate: Date,
    extras: Object,
    token: String,
    tokenExpires: Number
});

User.statics.userExists =  (filter) => {
    return this.findOne(filter)
    .then((result) => !!result);
};

User.statics.getUser = (filter) =>{
    return this.findOne(filter)
    .then(user => {
        if(user == null){
            throw new UserNotFound();
        }
        return user;
    });
};

User.statics.createUser = (data)=>{
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
        throw new Error("Password encryption failed :"+err)
    });
};

User.statics.resetPassword = (filter, password) =>{
    return PasswordEncryption.hashAndSalt(password)
    .then((results) => { 
        let data = {
            password: results.hash,
            passwordSalt: results.salt
        };
        return this.updateOne(filter, data);
    }, (err) => { 
        throw new Error("Password encryption failed :"+err)
    });
};

User.statics.isPasswordValid = (filter, password) =>{
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

User.statics.authenticate = (filter, password) =>{
    return this.isPasswordValid(filter, password)
    .then(isPasswordValid => {
        if(isPasswordValid){
            const data = {
                token : crypto.randomBytes(TOKEN_LENGTH).toString('base64'),
                tokenExpires: Date.now() + TOKEN_EXPIRATION
            };
            return this.updateOne(filter, data);
        } else {
            throw new WrongPasswordError()
        }
    })
    .then(() => this.getUser(filter));
};

User.statics.updateUser = (filter, data) =>{
    return this.updateOne(filter, data);
};

User.statics.removeUser = (filter) => {
    return this.deleteOne(filter);
}; 

module.exports = mongoose.model('user', User);