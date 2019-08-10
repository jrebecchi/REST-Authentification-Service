const UserspaceMailer = require('../service/mailer/UserspaceMailer');
const crypto = require('crypto');
const User = require('../model/UserModel');
const EmailValidator = require('../service/InputValidators/EmailValidator');
const PasswordValidator = require('../service/InputValidators/PasswordValidator');
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

exports.postChangePassword = function (req, res, next) {
    const notifications = [];
    if (req.user !== undefined) {
        //req.flash('error', "Oups, you are already logged in !");
        //res.redirect('/dashboard');
        notifications.push({ type: 'error', message: 'Oups, you are already logged in !' })
        res.json({ notifications: notifications });
        return;
    }
    let changePasswordToken = req.body.token;
    let newPassword = req.body.password;
    let user;
    const passwordAnalysis = PasswordValidator.analyse(req.body.password, req.body.confirm_password);
    if (!passwordAnalysis.isValid) {
        notifications = notifications.concat(emailAnalysis.notifications);
        res.json({ notifications: notifications });
        return;
    }
    if (!ChangePasswordFormValidator.isValid(req)) {
        //res.redirect('/password_renew?token='+token);
        return;
    }

    User.userExists({ 'extras.updatePasswordToken': changePasswordToken })
        .then((exists) => {
            if (!exists)
                throw new UserNotFound();
            return User.getUser({ 'extras.updatePasswordToken': changePasswordToken })
        })
        .then(userFound => {
            user = userFound;
            return User.update({ email: user.email }, { 'extras.updatePasswordToken': null, 'extras.passwordUpdateRequestDate': null });
        })
        .then(() => {
            let resetDate = new Date(user.extras.passwordUpdateRequestDate);
            let actualDate = new Date();
            let diff = Math.abs(actualDate - resetDate);
            let minutes = Math.floor((diff / 1000) / 60);
            if (minutes >= DELAY_TO_CHANGE_PASSWORD_IN_MINUTS)
                throw new UpdatePasswordTooLateError("This link has expired, please ask a new one.");
            return User.resetPassword({ email: user.email }, newPassword);
        })
        .then(() => {
            notifications.push({ type: 'success', message: 'Your password has been updated.' })
            res.json({ notifications: notifications });
            //req.flash('success', "Your password has been updated.");
            //res.redirect('/login');
        })
        .catch(next);
};

exports.postResetPassword = function (req, res, next) {
    const notifications = [];
    let updatePasswordToken;
    if (req.user !== undefined) {
        //req.flash('error', "Oups, you are already logged in !");
        //res.redirect('/dashboard');
        notifications.push({ type: 'error', message: 'Oups, you are already logged in!' })
        res.json({ notifications: notifications });
        return;
    }
    let email = req.body.email;

    const emailAnalysis = EmailValidator.analyse(email);
    if (!emailAnalysis.isValid) {
        notifications = notifications.concat(emailAnalysis.notifications);
        res.json({ notifications: notifications });
        return;
    }

    User.userExists({ email: email })
        .then((exists) => {
            if (!exists)
                throw new UserNotFound("If your email address exists in our database, you will receive a password recovery link at your email address in a few minutes.");
            updatePasswordToken = generateToken();
            let passwordUpdateRequestDate = new Date();
            return User.update({ email: email }, { 'updatePasswordToken': updatePasswordToken, 'passwordUpdateRequestDate': passwordUpdateRequestDate });
        })
        .then(() => {
            return User.getUser({ email: email });
        })
        .then((user) => {
            return UserspaceMailer.send(req, {
                locals: {
                    link: "http://" + req.headers.host + "/confirm_email?token=" + updatePasswordToken,
                    user, user
                },
                template: req.options.resetPasswordEmailTemplate,
                email: email,
                subject: 'Password Recovery',
                error: { notifications: { type: "error", message: "Mail not sent, an error has occured." } }
            });
        })
        .then(() => {
            //req.flash('info', "If your email address exists in our database, you will receive a password recovery link at your email address in a few minutes.");
            //res.redirect('/login');
            notifications.push({ type: 'info', message: 'If your email address exists in our database, you will receive a password recovery link at your email address in a few minutes.' })
            res.json({ notifications: notifications });
        })
        .catch(next);
};