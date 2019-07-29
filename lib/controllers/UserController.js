const UserspaceMailer = require('../service/mailer/UserspaceMailer');
const crypto = require('crypto');
const User = require('../model/UserModel');
const EmailValidator = require('../service/InputValidators/EmailValidator');
const PasswordValidator = require('../service/InputValidators/PasswordValidator');
const UsernameValidator = require('../service/InputValidators/UsernameValidator');
const {
    EmailAlreadyExistsError,
    UsernameAlreadyExistsError,
    WrongPasswordError,
    WrongLoginError,
    UserNotFound
} = require('../service/error/ErrorTypes');

const CONFIRM_EMAIL_TOKEN_LENGTH = 64;

const generateToken = function (cb) {
    return crypto.randomBytes(CONFIRM_EMAIL_TOKEN_LENGTH, cb).toString("hex");
};

exports.getCheckCredentialsExists = function (req, res, next) {
    if (req.query.email) checkEmailExists(req, res, next);
    else if (req.query.username) checkUsernameExists(req, res, next);
    else {
        res.json({
            notifications: [
                { type: 'error', message: "This request works for testing the existance of an email or a username in the database like the following: /exists?username=myusername or /exists?email=my.email@mail.com" }
            ]
        });
    }
}
const checkEmailExists = function (req, res, next) {
    const email = req.query.email;
    const emailAnalysis = EmailValidator.analyse(email);
    if (!emailAnalysis.isValid) {
        const notifications = emailAnalysis.notifications;
        res.json({ notifications: notifications });
        return;
    }

    User.userExists({ email: email })
        .then(emailExists => {
            if (emailExists) {
                res.json({
                    exists: true,
                });
            } else {
                res.json({
                    exists: false,
                });
            }
        })
        .catch(next);
};

const checkUsernameExists = function (req, res, next) {
    const username = req.query.username;
    const usernameAnalysis = UsernameValidator.analyse(username);
    if (!usernameAnalysis.isValid) {
        const notifications = usernameAnalysis.notifications;
        res.json({ notifications: notifications });
        return;
    }
    User.userExists({ username: username })
        .then(usernameExists => {
            if (usernameExists) {
                res.json({
                    exists: true,
                });
            } else {
                res.json({
                    exists: false,
                });
            }
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

    const user = {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        emailConfirmationCode: generateToken(),
        extras: {}
    };

    for (let index in req.body) {
        if (index !== "username" && index !== "password" && index !== "confirm_password" && index !== "email")
            user.extras[index] = req.body[index]
    }

    const emailAnalysis = EmailValidator.analyse(req.body.email);
    const usernameAnalysis = UsernameValidator.analyse(req.body.username);
    const passwordAnalysis = PasswordValidator.analyse(req.body.password, req.body.confirm_password);
    if (!emailAnalysis.isValid || !usernameAnalysis.isValid || !passwordAnalysis.isValid) {
        notifications = notifications.concat(emailAnalysis.notifications);
        notifications = notifications.concat(usernameAnalysis.notifications);
        notifications = notifications.concat(passwordAnalysis.notifications);
        notifications.push({ type: 'error', message: 'Unvalid registration!' })
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
            notifications.push({ type: 'success', message: 'User created!' })
            const error = {
                notifications: [
                    { type: "error", message: "Confirmation email not sent, an error has occured." }
                ]
            };
            return sendConfirmationEmail(req, user, user.emailConfirmationCode, req.headers.host, error)
        })
        .then(() => {
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
    sendConfirmationEmail(req, req.user, req.user.extras.emailConfirmationCode, req.headers.host, error)
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
            return sendConfirmationEmail(req, req.user, emailConfirmationCode, req.headers.host, error)
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

const sendConfirmationEmail = (req, user, confirmationToken, host, error) => {
    return UserspaceMailer.send(req, {
        email: user.email,
        template: req.options.confirmEmailTemplate,
        locals: {
            link: "http://" + host + "/confirm_email?token=" + confirmationToken,
            user: user
        },
        subject: 'Activate your account',
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


exports.postLogin = function (req, res, next) {
    const notifications = [];
    // if (!req.body.remember) {
    //     //req.session.cookie.expires = false; // Cookie expires at end of session
    // }
    ////res.redirect('/dashboard');
    let login = req.body.login;
    let password = req.body.password;
    let emailFound = false;
    let usernameFound = false;
    User.userExists({ email: login })
        .then(emailExists => {
            emailFound = emailExists;
            return User.userExists({ username: login });
        })
        .then(usernameExists => {
            usernameFound = usernameExists;
            if (emailFound)
                return User.sign({ email: login }, password, req.options.privateKey)
            else if (usernameFound)
                return User.sign({ username: login }, password, req.options.privateKey)
            else
                throw new WrongLoginError();
        })
        .then(token => {
            res.json({ token })
        })
        .catch(next);
};