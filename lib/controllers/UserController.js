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

exports.checkCredentialAvailable = function (req, res, next) {
    if (req.query.email) checkEmailAvailable(req, res, next);
    else if (req.query.username) checkUsernameAvailable(req, res, next);
    else {
        res.json({
            notifications: [
                { type: 'error', message: "This request works for testing the existance of an email or a username in the database like the following: /user/available?username=myusername or /user/available?email=my.email@mail.com" }
            ]
        });
    }
}
const checkEmailAvailable = function (req, res, next) {
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
                    available: false,
                });
            } else {
                res.json({
                    available: true,
                });
            }
        })
        .catch(next);
};

const checkUsernameAvailable = function (req, res, next) {
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
                    available: false,
                });
            } else {
                res.json({
                    available: true,
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

exports.updateUser = async function (req, res, next) {
    let notifications = [];

    const userUpdates = {
        ...req.body,
        extras: {
            ...req.user.extras
        }
    };

    for (let index in req.body) {
        if (index !== "username" && index !== "password" && index !== "confirm_password" && index !== "email" && index !== "previous_password")
            userUpdates.extras[index] = req.body[index]
    }

    if (userUpdates.email) {
        userUpdates.emailConfirmationCode = await generateToken();
        const emailAnalysis = EmailValidator.analyse(req.body.email);
        notifications = notifications.concat(emailAnalysis.notifications);
    }

    if (userUpdates.username) {
        const usernameAnalysis = UsernameValidator.analyse(req.body.username);
        notifications = notifications.concat(usernameAnalysis.notifications);
    }

    if (userUpdates.password) {
        const passwordAnalysis = PasswordValidator.analyse(req.body.password, req.body.confirm_password);
        notifications = notifications.concat(passwordAnalysis.notifications);
        if ( req.body.previous_password === undefined )
            notifications.push({ type: 'error', message: 'Please provide your previous password!' })
    }
    
    if (notifications.length !== 0) {
        res.json({ notifications: notifications });
        return;
    }

    try {
        if (userUpdates.password && userUpdates.password !== req.body.previous_password) {
            const isValid = await User.isPasswordValid({ email: req.user.email },  req.body.previous_password);
            if (!isValid) throw new WrongPasswordError("Your previous password is wrong!");
        }
        if (userUpdates.username && userUpdates.username !== req.user.username) {
            const usernameExists =  await User.userExists({ username: userUpdates.username });
            if (usernameExists) throw new UsernameAlreadyExistsError("Username already exists");
        }
        if (userUpdates.email && userUpdates.email !== req.user.email) {
            const emailExists = await User.userExists({ email: userUpdates.email });
            if (emailExists) throw new EmailAlreadyExistsError("Email already exists");
        }
        req.user = await User.updateUser({ _id: req.user._id }, userUpdates);
        notifications.push({ type: 'success', message: 'User information updated!' });
        if (userUpdates.email) {
            error = { notifications: { type: "error", message: "Mail not sent, an error has occured." } }
            await sendConfirmationEmail(req, req.user, userUpdates.emailConfirmationCode, req.headers.host, error)
        }
        const payload  = await User.updateToken({ _id: req.user._id }, req.options.privateKey)
        res.json({
            ...payload,
            notifications
        })
    } catch (err) { 
        next(err);
    } 
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
                throw new WrongLoginError('Wrong credentials!');
        })
        .then((payload) => {
            res.json(payload)
        })
        .catch(next);
};
