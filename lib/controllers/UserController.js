const crypto = require('crypto');
const User = require('../model/UserModel')();
const agenda = require('../service/agenda/agenda')();
const ejs = require('ejs')
const {
    EmailAlreadyExistsError,
    UsernameAlreadyExistsError,
    WrongPasswordError,
    WrongLoginError,
    UserNotFound,
    UnknownUser,
    EmailAlreadyConfirmedError,
    UserValidationError
} = require('../service/error/ErrorTypes');

const TOKEN_LENGTH = 64;
const DELAY_TO_CHANGE_PASSWORD_IN_MINUTS = 60;

const ensureLoggedIn = (req) => {
    if (req.user === undefined) throw new UnknownUser('Please login!');
}

const generateToken = function (cb) {
    return crypto.randomBytes(TOKEN_LENGTH, cb).toString("hex");
};

exports.checkCredentialAvailable = function (req, res, next) {
    if (req.query.email) checkEmailAvailable(req, res, next);
    else if (req.query.username && req.options.hasUsername) checkUsernameAvailable(req, res, next);
    else {
        res.json({
            notifications: [
                { type: 'error', message: "This request works for testing the existance of an email or a username in the database like the following: /user/available?username=myusername or /user/available?email=my.email@mail.com" }
            ]
        });
    }
}
const checkEmailAvailable = async function (req, res, next) {
    const email = req.query.email;
    try {
        const emailExists = await User.userExists({ email: email })
        if (emailExists) res.json({ available: false });
        else res.json({ available: true });
    } catch (err) {
        next(err)
    }
};

const checkUsernameAvailable = async function (req, res, next) {
    const username = req.query.username;
    try {
        const usernameExists = await User.userExists({ username: username })
        if (usernameExists) res.json({ available: false });
        else res.json({ available: true });
    } catch (err) {
        next(err)
    }
};

exports.confirmEmail = async function (req, res, next) {
    const notifications = [];
    let token = req.query.token;
    try {
        const exists = await User.userExists({ 'verificationToken': token })
        if (!exists) throw new UserNotFound("This link is no longer valid.");
        const user = await User.getUser({ 'verificationToken': token })
        await User.update({ email: user.email }, { 'verificationToken': null, 'verified': true, });
        notifications.push({ type: 'success', message: 'Your email adress is now confirmed !' })
    } catch (err) {
        notifications.push({ type: 'error', message: 'This link is not valid!' })
    } finally {
        ejs.renderFile(req.options.notificationPageTemplate, {notifications}, {notifications}, function (err, html) {
            if (err) {
                next(err);
            } else {
                res.send(html);
            }
        });
    }
};

exports.createUser = async function (req, res, next) {
    let notifications = [];
    const user = {
        ...req.body,
        verificationToken: generateToken(),
    };
    if (user.password.length < 8) {
        notifications.push({ type: "error", message: "The password must contain at least 8 characters!" });
        return res.json({ notifications: notifications });
    }
    try {
        await User.createUser(user);
        notifications.push({ type: 'success', message: 'User created!' });
        sendConfirmationEmail(req, user, user.verificationToken, req.headers.host);
        notifications.push({ type: 'info', message: 'You will receive a confirmation link at your email address in a few minutes.' })
        res.json({ notifications: notifications });
    } catch (err) {
        if (err.message.includes("username") && err.message.includes("duplicate key")) err = new UsernameAlreadyExistsError("Username already exists");
        if (err.message.includes("email")  && err.message.includes("duplicate key")) err = new EmailAlreadyExistsError("Email already exists");
        next(new UserValidationError(err.message.replace("user validation failed: email: ", "")))
    }
};

exports.resendConfirmationEmail = async function (req, res, next) {
    try {
        ensureLoggedIn(req);
        const notifications = [];
        const user = await User.getUser({ _id: req.user.id });
        if (user.verified) {
            throw new EmailAlreadyConfirmedError("Your email adress has already been confirmed.")
        } else {
            sendConfirmationEmail(req, req.user, user.verificationToken, req.headers.host)
            notifications.push({ type: 'success', message: 'You will receive a confirmation link at your email address in a few minutes.' })
        }
        res.json({ notifications: notifications });
    } catch (err) {
        next(err)
    }
};

const recoverPassword = async function (req, res, next) {
    try {
        let notifications = [];
        const password = req.body.password;
        if (password.length < 8) {
            notifications.push({ type: "error", message: "The password must contain at least 8 characters!" });
            return res.json({ notifications: notifications });
        }
        const passwordRecoveryToken = req.body["passwordRecoveryToken"]
        if (passwordRecoveryToken) {
            const userExists = await User.userExists({ 'passwordRecoveryToken': passwordRecoveryToken })
            if (!userExists) throw new UserNotFound("Unvalid token!");
            const user = await User.getUser({ 'passwordRecoveryToken': passwordRecoveryToken })
            let resetDate = new Date(user.passwordRecoveryRequestDate);
            let actualDate = new Date();
            let diff = Math.abs(actualDate - resetDate);
            let minutes = Math.floor((diff / 1000) / 60);
            if (minutes >= DELAY_TO_CHANGE_PASSWORD_IN_MINUTS)
                throw new UpdatePasswordTooLateError("This link has expired, please ask a new one.");
            await User.updateUser({ _id: user.id }, { password: password, passwordRecoveryToken: undefined, passwordRecoveryRequestDate: undefined });
            notifications.push({ type: "success", message: "Your password is updated!" })
            return res.json({ notifications: notifications });
        }
    } catch (err) {
        next(err);
    }
}

exports.updateUser = async function (req, res, next) {
    if (req.body["passwordRecoveryToken"]) return recoverPassword(req, res, next);
    else ensureLoggedIn(req);

    try {
        let notifications = [];
        const userUpdates = {
            ...req.body,
        };

        if (userUpdates.password && userUpdates.password !== req.body.previousPassword) {
            const isValid = await User.isPasswordValid({ email: req.user.email }, req.body.previousPassword);
            if (!isValid) {
                notifications.push({ type: 'error', message: 'Your previous password is wrong!' })
                return res.json({ notifications: notifications });
            }
            if (userUpdates.password.length < 8) {
                notifications.push({ type: "error", message: "The password must contain at least 8 characters!" });
                return res.json({ notifications: notifications });
            }
        }

        if (!req.user.verified && userUpdates.email){
            userUpdates.verificationToken = generateToken();
        }

        await User.updateUser({ _id: req.user.id }, userUpdates);
        req.user = await User.getUserPublicInfos({ _id: req.user.id })
        notifications.push({ type: 'success', message: 'User information updated!' });

        const payload = await User.updateToken({ _id: req.user.id }, req.options.privateKey)
        
        if (!req.user.verified && userUpdates.email) {
            sendConfirmationEmail(req, req.user, userUpdates.verificationToken, req.headers.host);
            notifications.push({ type: 'info', message: 'You will receive a confirmation link at your email address in a few minutes.' });
        }
        res.json({
            ...payload,
            notifications
        })
    } catch (err) {
        if (err.message.includes("username") && err.message.includes("duplicate key")) err = new UsernameAlreadyExistsError("Username already exists");
        if (err.message.includes("email")  && err.message.includes("duplicate key")) err = new EmailAlreadyExistsError("Email already exists");
        next(new UserValidationError(err.message.replace("user validation failed: email: ", "")))
    }
};


exports.deleteUser = async function (req, res, next) {
    try {
        ensureLoggedIn(req);
        const notifications = [];
        let password = req.body.password;
        const isValid = await User.isPasswordValid({ email: req.user.email }, password)
        if (!isValid) {
            throw new WrongPasswordError("You entered a wrong password");
        }
        await User.removeUser({ email: req.user.email });
        notifications.push({ type: 'success', message: 'Your account has been deleted.' })
        res.json({ notifications: notifications });
    } catch (err) {
        next(err)
    }
};

const sendConfirmationEmail = (req, user, confirmationToken, host) => {
    agenda.now('email', {
        email: user.email,
        template: req.options.verifyEmailTemplate,
        locals: {
            link: "http://" + host + "/user/email/confirmation?token=" + confirmationToken,
            user: user
        },
        subject: 'Activate your account',
    });
};

exports.getAuthToken = async function (req, res, next) {
    try {
        let payload;
        let login = req.body.login;
        let password = req.body.password;
        const emailExists = await User.userExists({ email: login })
        const usernameExists = await User.userExists({ username: login });
        if (emailExists)
            payload = await User.sign({ email: login }, password, req.options.privateKey);
        else if (usernameExists)
            payload = await User.sign({ username: login }, password, req.options.privateKey);
        else
            throw new WrongLoginError('Wrong credentials!');
        res.json(payload)
    } catch (err) {
        next(err)
    }
};

exports.sendPasswordRecoveryEmail = async function (req, res, next) {
    const notifications = [];
    if (req.user !== undefined) {
        notifications.push({ type: 'error', message: 'Oups, you are already logged in!' })
        res.json({ notifications: notifications });
        return;
    }
    let email = req.body.email;
    try {
        let exists = await User.userExists({ email: email });
        if (!exists)
            throw new UserNotFound("If your email address exists in our database, you will receive a password recovery link at your email address in a few minutes.");
        let passwordRecoveryToken = generateToken();
        let passwordRecoveryRequestDate = new Date();
        await User.update({ email: email }, { 'passwordRecoveryToken': passwordRecoveryToken, 'passwordRecoveryRequestDate': passwordRecoveryRequestDate });
        let user = await User.getUser({ email: email });
        agenda.now('email', {
            locals: {
                link: "http://" + req.headers.host + "/form/reset/password?token=" + passwordRecoveryToken,
                user, user
            },
            template: req.options.resetPasswordEmailTemplate,
            email: email,
            subject: 'Password Recovery',
        });
        notifications.push({ type: 'info', message: 'If your email address exists in our database, you will receive a password recovery link at your email address in a few minutes.' })
        res.json({ notifications: notifications });
    } catch (err) {
        next(err)
    }
};

exports.resetPasswordForm = function (req, res, next) {
    const notifications = [];
    if (req.user) {
        notifications.push({ type: 'error', message: 'Oups, you are already logged in!' })
        res.json({ notifications: notifications });
        next();
        return;
    }
    const locals = {
        link: "http://" + req.headers.host + "/user",
        token: req.query.token
    }
    ejs.renderFile(req.options.resetPasswordFormTemplate, locals, {}, function (err, html) {
        if (err) {
            next(err);
        } else {
            res.send(html);
        }
    });
};
