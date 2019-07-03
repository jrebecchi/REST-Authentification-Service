const UserspaceMailer = require('../service/mailer/UserspaceMailer');
const crypto = require('crypto');
const User = require('../model/UserModel');
const RegistrationFormValidator = require('../service/forms/RegistrationFormValidator');
const ModifyFirstNameFormValidator = require('../service/forms/ModifyFirstNameFormValidator');
const ModifyLastNameFormValidator = require('../service/forms/ModifyLastNameFormValidator');
const ModifyPasswordFormValidator = require('../service/forms/ModifyPasswordFormValidator');
const ModifyEmailFormValidator = require('../service/forms/ModifyEmailFormValidator');
const ModifyUsernameFormValidator = require('../service/forms/ModifyUsernameFormValidator');
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

exports.getCheckEmailExists = function (req, res, next){
    let email = req.query.email;
    User.userExists({email: email})
    .then(emailExists => {
        if(emailExists){
            res.json({
                "emailExists": true,
                "errorMsg": "This email address is already used. You can sign in with this one or type another !"
            });
        } else {
            res.json({
                "emailExists": false,
                "errorMsg": ""
            });
        }
    })
    .catch(next);
};

exports.getCheckUsernameExists = function (req, res, next){
    let username = req.query.username;
    User.userExists({username: username})
    .then(usernameExists => {
        if(usernameExists){
            res.json({
                "usernameExists": true,
                "errorMsg": "This username is already used. Please type another !"
            });
        } else {
            res.json({
                "usernameExists": false,
                "errorMsg": ""
            });
        }
    })
    .catch(next);
};

exports.getConfirmEmail = function(req, res, next){
    let token = req.query.token;
    User.userExists({'extras.emailConfirmationCode': token})
    .then((exists) =>{
        if (!exists)
            throw new UserNotFound('/', {type: "error", message:"This link is no longer valid."});
        return User.getUser({'extras.emailConfirmationCode': token})
    })
    .then(user => {
        return User.update({email: user.email}, {'extras.emailConfirmationCode': null, 'extras.emailConfirmed': true,});
    })
    .then(() => {
        req.flash('success', "Your email adress is now confirmed !");
        res.redirect('/dashboard');
    })
    .catch(next);
};

exports.postCreateUser = function (req, res, next){
    if (req.user !== undefined){
        req.flash('error', "To register a new account you need to deconnect yourself !");
        res.redirect('/dashboard');
        return;
    }
    const user = { 
        username: req.body.username.trim(),
        email: req.body.email.trim(),
        password: req.body.password,
        extras: {
            lastName: req.body.last_name.trim(),
            firstName: req.body.first_name.trim(),
            emailConfirmationCode: generateToken()
        }
    };
    if (!RegistrationFormValidator.isValid(req, res, next)){
        res.redirect('/register?username='+user.username+'&email='+user.email+'&lastName='+user.extras.lastName+'&firstName='+user.extras.firstName);
        return;
    }
    User.userExists({username: user.username})
    .then(usernameExists => {
        if (usernameExists){
            throw new UsernameAlreadyExistsError('/register?username='+user.username+'&email='+user.email+'&lastName='+user.extras.lastName+'&firstName='+user.extras.firstName, {type: "error", message:"Username already exists"});
            ;
        } else {
            return User.userExists({email: user.email});
        }
    })
    .then(emailExists => {
        if (emailExists){
            throw new EmailAlreadyExistsError('/register?username='+user.username+'&email='+user.email+'&lastName='+user.extras.lastName+'&firstName='+user.extras.firstName, {type: "error", message:"Email already exists"});
        } else {
            return User.createUser(user);
        }
    })
    .then(() => {
        req.flash('success', 'User created !');
        const error = {
            redirection: '/login',
            flashMessage: {type: "error", message:"Confirmation email not sent, an error has occured."}
        }
        return sendConfirmationEmail(user.email, user.extras.emailConfirmationCode, req.headers.host, error)
    })
    .then(() => {
            req.flash('info', "You will receive a confirmation link at your email address in a few minutes.");
            res.redirect('/login');
    })
    .catch(next);
};

exports.getSendConfirmationEmail = function(req, res, next){
    const error = {
        redirection: '/dashboard',
        flashMessage: {type: "error", message:"Confirmation email not sent, an error has occured."}
    }
    sendConfirmationEmail(req.user.email, req.user.extras.emailConfirmationCode, req.headers.host, error)
    .then(() => {
        req.flash('success', "You will receive a confirmation link at your email address in a few minutes.");
        res.redirect('/dashboard');
    })
    .catch(next);
};

exports.postModifyPassword = function(req, res, next){
    let oldPassword = req.body.old_password;
    let newPassword = req.body.password;
    if (!ModifyPasswordFormValidator.isValid(req)){
        res.redirect("/settings");
        return;
    }
    User.isPasswordValid({email: req.user.email}, oldPassword)
    .then(isValid => {
        if (!isValid){
            throw new WrongPasswordError("/settings", {type: "error", message:"You entered a wrong password"});
        }
        return User.resetPassword({email: req.user.email}, newPassword);
    })
    .then(() => {
        req.flash('success', "Your password is now updated !");
        res.redirect('/settings');
    })
    .catch(next);
};

exports.postModifyUsername = function(req, res, next){
    let username = req.body.username.trim();
    if (!ModifyUsernameFormValidator.isValid(req)){
        res.redirect("/settings");
        return;
    }
    if(username === req.user.username){
        req.flash('info',"This is the same username as the previous one.");
        res.redirect("/settings");
        return;
    }
    User.userExists({username: username})
    .then(usernameExists => {
        if(usernameExists)
            throw new UsernameAlreadyExistsError("/settings", {type: "error", message:"Username already exists"});
        return User.update({email: req.user.email}, {username: username});
    })
    .then(() => {
        req.flash('success', "Your username is now updated.");
        res.redirect('/settings');
    })
    .catch(next);
};

exports.postModifyEmail = function(req, res, next){
    let email = req.body.email.trim();
    let emailConfirmationCode;
    if (!ModifyEmailFormValidator.isValid(req)){
        res.redirect("/settings");
        return;
    }
    if(email === req.user.email){
        req.flash('info',"This is the same email as the previous one!");
        res.redirect("/settings");
        return;
    }
    User.userExists({email: email})
    .then(emailExists => {
        if(emailExists)
            throw new EmailAlreadyExistsError("/settings", {type: "error", message:"Email already exists"});
        emailConfirmationCode = generateToken();
        return User.update({username: req.user.username}, {email: email, 'extras.emailConfirmationCode': emailConfirmationCode, "extras.emailConfirmed": false});
    })
    .then(() => {
        req.flash('success', "Your email is now updated !");
        const error = {
            redirection: '/settings',
            flashMessage: {type: "error", message:"Confirmation email not sent, an error has occured."}
        }
        return sendConfirmationEmail(email, emailConfirmationCode, req.headers.host, error)
    })
    .then(() => {
        req.flash('info', "You will receive a confirmation link at your email address in a few minutes.");
        res.redirect('/settings');
    })
    .catch(next);
};

exports.postModifyFirstName = function(req, res, next){
    let firstName = req.body.first_name.trim();
    if (!ModifyFirstNameFormValidator.isValid(req)){
        res.redirect("/settings");
        return;
    }
    if(firstName === req.user.extras.firstName){
        req.flash('info',"This is the same first name as the previous one!");
        res.redirect("/settings");
        return;
    }
    User.update({email: req.user.email}, {'extras.firstName': firstName})
    .then(() => {
        req.flash('success', "Your first name is now updated !");
        res.redirect('/settings');
    })
    .catch(next);
};

exports.postModifyLastName = function(req, res, next){
    let lastName = req.body.last_name.trim();
    if (!ModifyLastNameFormValidator.isValid(req)){
        res.redirect("/settings");
        return;
    }
    if(lastName === req.user.extras.lastName){
        req.flash('info',"This is the same last name as the previous one!");
        res.redirect("/settings");
        return;
    }
    User.update({email: req.user.email}, {'extras.lastName': lastName})
    .then(() => {
        req.flash('success', "Your last names is now updated !");
        res.redirect('/settings');
    })
    .catch(next);
};

exports.postDeleteAccount = function(req, res, next){
    let password = req.body.password;
    User.isPasswordValid({email: req.user.email}, password)
    .then(isValid => {
        if (!isValid){
            throw new WrongPasswordError("/settings", {type: "error", message:"You entered a wrong password"});
        }
        return User.removeUser({email: req.user.email});
    })
    .then(() => {
        req.flash('success', "Your account has been deleted");
        req.logout();
        res.redirect('/');
    })
    .catch(next);
};

const sendConfirmationEmail = (email, confirmationToken, host, error) => {
    return UserspaceMailer.send({
        email: email, 
        subject: 'Activate your account', 
        template: path.resolve(__dirname,'../views/emails/','confirm_email.ejs'),
        locals: {
            confirmationToken: confirmationToken,
            host: host
        },
        error: error
    })
};