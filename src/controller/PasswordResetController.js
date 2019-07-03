const UserspaceMailer = require('../service/mailer/UserspaceMailer');
const crypto = require('crypto');
const User = require('../model/UserModel');
const ResetPasswordFormValidator = require('../service/forms/ResetPasswordFormValidator');
const ChangePasswordFormValidator = require('../service/forms/ChangePasswordFormValidator');
const path = require('path');
const RECOVER_PASSWORD_TOKEN_LENGTH = 64;
const DELAY_TO_CHANGE_PASSWORD_IN_MINUTS = 60;
const {
    UpdatePasswordTooLateError,
    UserNotFound,
} = require('../service/error/ErrorTypes');

const generateToken = (cb) => {
    return crypto.randomBytes(RECOVER_PASSWORD_TOKEN_LENGTH, cb).toString("hex");
};

exports.postChangePassword = function (req, res, next){
    if(req.user !== undefined){
        req.flash('error', "Oups, you are already logged in !");
        res.redirect('/dashboard');
        return;
    }
    let token = req.body.token;
    let newPassword = req.body.password;
    let user;

    if(!ChangePasswordFormValidator.isValid(req)){
        res.redirect('/password_renew?token='+token);
        return;
    }

    User.userExists({'extras.updatePasswordToken': token})
    .then((exists) =>{
        if (!exists)
            throw new UserNotFound();
        return User.getUser({'extras.updatePasswordToken': token})
    })
    .then(userFound => {
        user = userFound;
        return User.update({email: user.email}, {'extras.updatePasswordToken': null, 'extras.passwordUpdateRequestDate': null});
    })
    .then(() => {        
        let resetDate = new Date(user.extras.passwordUpdateRequestDate);
        let actualDate = new Date();
        let diff = Math.abs(actualDate - resetDate);
        let minutes = Math.floor((diff/1000)/60);
        if(minutes >= DELAY_TO_CHANGE_PASSWORD_IN_MINUTS)
            throw new UpdatePasswordTooLateError("/password_reset", {type: "error", message:"This link has expired, please ask a new one."});
        return User.resetPassword({email: user.email}, newPassword);
    })
    .then(() => {
        req.flash('success', "Your password has been updated.");
        res.redirect('/login');
    })
    .catch(next);
};

exports.getShowChangePasswordForm = function (req, res){
    if(req.user !== undefined){
        req.flash('error', "Oups, you are already logged in !");
        res.redirect('/dashboard');
        return;
    }
    res.render('pages/change-password.ejs', {token: req.query.token, csrfToken: req.csrfToken() });
};

exports.getShowPasswordRecoveryForm = function (req, res){
    if(req.user !== undefined){
        req.flash('error', "Oups, you are already logged in !");
        res.redirect('/dashboard');
        return;
    }
    res.render('pages/forgot-password.ejs', {email: req.query.email, csrfToken: req.csrfToken() });
};

exports.postResetPassword = function (req, res, next){
    let updatePasswordToken;
    if(req.user !== undefined){
        req.flash('error', "Oups, you are already logged in !");
        res.redirect('/dashboard');
        return;
    }
    let email = req.body.email;
    if(!ResetPasswordFormValidator.isValid(req, res, next)){
        res.redirect('/password_reset?email='+email);
        return;
    }
    User.userExists({email: email})
    .then((exists) =>{
        if (!exists)
            throw new UserNotFound('/login', {type: "info", message:"If your email address exists in our database, you will receive a password recovery link at your email address in a few minutes."});
        updatePasswordToken = generateToken();
        let passwordUpdateRequestDate = new Date();
        return User.update({email: email}, {'extras.updatePasswordToken': updatePasswordToken, 'extras.passwordUpdateRequestDate': passwordUpdateRequestDate})
    })
    .then(() => {
        return UserspaceMailer.send({ 
            template: path.resolve(__dirname,'../views/emails/','reset_password.ejs'), 
            locals:{
                updatePasswordToken: updatePasswordToken,
                host: req.headers.host
            },
            email : email, 
            subject:'Password Recovery',
            error : {
                redirection: '/login',
                flashMessage: {type: "error", message:"Mail not sent, an error has occured."}
            }
        });
    })
    .then(() => {
        req.flash('info', "If your email address exists in our database, you will receive a password recovery link at your email address in a few minutes.");
        res.redirect('/login');
    })
    .catch(next);
};