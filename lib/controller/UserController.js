const UserspaceMailer = require('../service/mailer/UserspaceMailer');
const crypto = require('crypto');
const User = require('../model/UserModel');
const EmailValidator = require('../service/InputValidators/EmailValidator');
const PasswordValidator = require('../service/InputValidators/PasswordValidator');
const UsernameValidator = require('../service/InputValidators/UsernameValidator');
const path = require('path');
const {
    EmailAlreadyExistsError,
    UsernameAlreadyExistsError,
    WrongPasswordError,
    UserNotFound
} = require('../service/error/ErrorTypes');

const CONFIRM_EMAIL_TOKEN_LENGTH = 64;

const generateToken = function (cb) {
    return crypto.randomBytes(CONFIRM_EMAIL_TOKEN_LENGTH, cb).toString("hex");
};

exports.getCheckEmailExists = function (req, res, next) {
    const email = req.query.email;

    const emailAnalysis = EmailValidator.analyse(email);
    if (!emailAnalysis.isValid) {
        const notifications = [];
        notifications = notifications.concat(emailAnalysis.notifications);
        res.json({ notifications: notifications });
        return;
    }

    User.userExists({ email: email })
        .then(emailExists => {
            if (emailExists) {
                res.json({
                    isEmailAvailable: false,
                });
            } else {
                res.json({
                    isEmailAvailable: true,
                });
            }
        })
        .catch(next);
};

exports.getCheckUsernameExists = function (req, res, next) {
    const username = req.query.username;

    const usernameAnalysis = UsernameValidator.analyse(username);
    if (usernameAnalysis.isValid) {
        const notifications = [];
        notifications = notifications.concat(usernameAnalysis.notifications);
        res.json({ notifications: notifications });
        return;
    }
    User.userExists({ username: username })
        .then(usernameExists => {
            if (usernameExists) {
                res.json({
                    isUsernameAvailable: false,
                });
            } else {
                res.json({
                    isUsernameAvailable: true,
                });
            }
            res.json({ notifications: notifications });
        })
        .catch(next);
};

exports.getConfirmEmail = function (req, res, next) {
    const notifications = [];
    let token = req.query.token;
    User.userExists({ 'extras.emailConfirmationCode': token })
        .then((exists) => {
            if (!exists)
                throw new UserNotFound("This link is no longer valid.");
            return User.getUser({ 'extras.emailConfirmationCode': token })
        })
        .then(user => {
            return User.update({ email: user.email }, { 'extras.emailConfirmationCode': null, 'extras.emailConfirmed': true, });
        })
        .then(() => {
            notifications.push({ type: 'success', message: 'Your email adress is now confirmed !' })
            res.json({ notifications: notifications });
        })
        .catch(next);
};

exports.postCreateUser = function (req, res, next) {
    let notifications = [];
    // if (req.user !== undefined) {
    //     //req.flash('error', "To register a new account you need to deconnect yourself!");
    //     //res.redirect('/dashboard');
    //     notifications.push({ type: 'error', message: 'To register a new account you need to deconnect yourself!' })
    //     res.json({ notifications: notifications });
    //     return;
    // }
    //Fixme 
    const user = {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        emailConfirmationCode: generateToken(),
        extras: {}
    };

    for (let index in req.body) {
        if (index !== "username" && index !== "password" && index !== "confirm_password" && index !== email)
            user.extras[index] = req.body[index]
    }

    const emailAnalysis = EmailValidator.analyse(req.body.email);
    const usernameAnalysis = UsernameValidator.analyse(req.body.username);
    const passwordAnalysis = PasswordValidator.analyse(req.body.password, req.body.confirm_password);
    if (!emailAnalysis.isValid || !usernameAnalysis.isValid || !passwordAnalysis.isValid) {
        notifications = notifications.concat(emailAnalysis.notifications);
        notifications = notifications.concat(usernameAnalysis.notifications);
        notifications = notifications.concat(passwordAnalysis.notifications);
        notifications.push({ type: 'error', message: 'Unvalid registration form!' })
        res.json({ notifications: notifications });
        return;
    }

    User.userExists({ username: user.username })
        .then(usernameExists => {
            if (usernameExists) {
                throw new UsernameAlreadyExistsError("Username already exists");
                ;
            } else {
                return User.userExists({ email: user.email });
            }
        })
        .then(emailExists => {
            if (emailExists) {
                throw new EmailAlreadyExistsError("Email already exists");
            } else {
                return User.createUser(user);
            }
        })
        .then(() => {
            //req.flash('success', 'User created!');
            notifications.push({ type: 'success', message: 'User created!' })
            // res.json({ notifications: notifications });
            // const error = {
            //     redirection: '/login',
            //     flashMessage: {type: "error", message:"Confirmation email not sent, an error has occured."}
            // }
            const error = {
                notifications: [
                    { type: "error", message: "Confirmation email not sent, an error has occured." }
                ]
            };
            return sendConfirmationEmail(req, user.email, user.extras.emailConfirmationCode, req.headers.host, error)
        })
        .then(() => {
            //req.flash('info', "You will receive a confirmation link at your email address in a few minutes.");
            //res.redirect('/login');
            notifications.push({ type: 'info', message: 'You will receive a confirmation link at your email address in a few minutes.' })
            res.json({ notifications: notifications });
        })
        .catch(next);
};

exports.getSendConfirmationEmail = function (req, res, next) {
    const notifications = [];
    // const error = {
    //     redirection: '/dashboard',
    //     flashMessage: {type: "error", message:"Confirmation email not sent, an error has occured."}
    // }
    const error = {
        notifications: [
            { type: "error", message: "Confirmation email not sent, an error has occured." }
        ]
    };
    sendConfirmationEmail(req, req.user.email, req.user.extras.emailConfirmationCode, req.headers.host, error)
        .then(() => {
            //req.flash('success', "You will receive a confirmation link at your email address in a few minutes.");
            //res.redirect('/dashboard');
            notifications.push({ type: 'success', message: 'You will receive a confirmation link at your email address in a few minutes.' })
            res.json({ notifications: notifications });
        })
        .catch(next);
};

exports.putUpdatePassword = function (req, res, next) {
    const notifications = [];
    const oldPassword = req.body.old_password;
    const confirmPassword = req.body.confirm_password;
    const newPassword = req.body.password;

    const passwordAnalysis = PasswordValidator.analyse(newPassword, confirmPassword);
    if (!passwordAnalysis.isValid) {
        notifications = notifications.concat(passwordAnalysis.notifications);
        res.json({ notifications: notifications });
        return;
    }

    User.isPasswordValid({ email: req.user.email }, oldPassword)
        .then(isValid => {
            if (!isValid) {
                throw new WrongPasswordError("You entered a wrong password");
            }
            return User.resetPassword({ email: req.user.email }, newPassword);
        })
        .then(() => {
            //req.flash('success', "Your password is now updated!");
            //res.redirect('/settings');
            notifications.push({ type: 'success', message: 'Your password is now updated!' })
            res.json({ notifications: notifications });
        })
        .catch(next);
};

exports.putUpdateUsername = function (req, res, next) {
    let notifications = [];
    const username = req.body.username;
    const usernameAnalysis = UsernameValidator.analyse(req.body.username);
    if (!usernameAnalysis.isValid) {
        notifications = notifications.concat(usernameAnalysis.notifications);
        res.json({ notifications: notifications });
        return;
    }
    if (username === req.user.username) {
        //req.flash('info',"This is the same username as the previous one.");
        //res.redirect("/settings");
        notifications.push({ type: 'info', message: 'This is the same username as the previous one.' })
        res.json({ notifications: notifications });
        return;
    }
    User.userExists({ username: username })
        .then(usernameExists => {
            if (usernameExists)
                throw new UsernameAlreadyExistsError("Username already exists");
            return User.update({ email: req.user.email }, { username: username });
        })
        .then(() => {
            //req.flash('success', "Your username is now updated.");
            //res.redirect('/settings');
            notifications.push({ type: 'success', message: 'Your username is now updated.' })
            res.json({ notifications: notifications });
        })
        .catch(next);
};

exports.putUpdateEmail = function (req, res, next) {
    const notifications = [];
    const email = req.body.email;
    let emailConfirmationCode;
    const emailAnalysis = EmailValidator.analyse(email);
    if (!emailAnalysis.isValid) {
        notifications = notifications.concat(emailAnalysis.notifications);
        res.json({ notifications: notifications });
        return;
    }
    if (email === req.user.email) {
        //req.flash('info',"This is the same email as the previous one!");
        //res.redirect("/settings");
        notifications.push({ type: 'info', message: 'This is the same email as the previous one!' })
        res.json({ notifications: notifications });
        return;
    }
    User.userExists({ email: email })
        .then(emailExists => {
            if (emailExists)
                throw new EmailAlreadyExistsError("Email already exists");
            emailConfirmationCode = generateToken();
            return User.update({ username: req.user.username }, { email: email, 'extras.emailConfirmationCode': emailConfirmationCode, "extras.emailConfirmed": false });
        })
        .then(() => {
            //req.flash('success', "Your email is now updated !");
            notifications.push({ type: 'success', message: 'Your email is now updated !' })
            // const error = {
            //     redirection: '/settings',
            //     flashMessage: {type: "error", message:"Confirmation email not sent, an error has occured."}
            // }
            return sendConfirmationEmail(req, email, emailConfirmationCode, req.headers.host, error)
        })
        .then(() => {
            //req.flash('info', "You will receive a confirmation link at your email address in a few minutes.");
            //res.redirect('/settings');
            notifications.push({ type: 'info', message: 'You will receive a confirmation link at your email address in a few minutes.' })
            res.json({ notifications: notifications });
        })
        .catch(next);
};

exports.putUpdateExtras = function (req, res, next) {
    const notifications = [];
    const updatedExtras = req.body.extras;
    const newExtras = Object.assign(req.user.extras, updatedExtras);
    User.update({ email: req.user.email }, { 'extras': newExtras })
        .then(() => {
            //req.flash('success', "Your first name is now updated!");
            //res.redirect('/settings');
            notifications.push({ type: 'success', message: 'Your first name is now updated!' })
            res.json({ notifications: notifications });
        })
        .catch(next);
};

exports.deleteUser = function (req, res, next) {
    const notifications = [];
    let password = req.body.password;
    User.isPasswordValid({ email: req.user.email }, password)
        .then(isValid => {
            if (!isValid) {
                throw new WrongPasswordError("You entered a wrong password");
            }
            return User.removeUser({ email: req.user.email });
        })
        .then(() => {
            //req.flash('success', "Your account has been deleted");
            notifications.push({ type: 'success', message: 'Your account has been deleted.' })
            res.json({ notifications: notifications });
            //req.logout();
            //res.redirect('/');
        })
        .catch(next);
};

const sendConfirmationEmail = (email, confirmationToken, host, error) => {
    return UserspaceMailer.send(req, {
        email: email,
        subject: 'Activate your account',
        template: path.resolve(__dirname, '../views/emails/', 'confirm_email.ejs'),
        locals: {
            confirmationToken: confirmationToken,
            host: host
        },
        error: error
    })
};

exports.getLogout = function (req, res) {
    const notifications = [];
    //req.logout();
    //res.redirect('/');
    notifications.push({ type: 'success', message: 'Your have been logged out.' })
    res.json({ notifications: notifications });
};


exports.postLogin = function (req, res) {
    const notifications = [];
    // if (!req.body.remember) {
    //     //req.session.cookie.expires = false; // Cookie expires at end of session
    // }
    ////res.redirect('/dashboard');
    let login;
    let password
    let emailFound;
    let usernameFound;
    User.userExists({ email: login })
        .then(emailExists => {
            emailFound = emailExists;
            return User.userExists({ username: login });
        })
        .then(usernameExists => {
            usernameFound = usernameExists;
            if (emailFound)
                return User.authenticate({ email: login }, password)
            else if (usernameFound)
                return User.authenticate({ username: login }, password)
            else
                throw new WrongLoginError();
        })
        .then(user => {
            // return cb(null, user);
            //Fixme
        })
        .catch(next);
};
