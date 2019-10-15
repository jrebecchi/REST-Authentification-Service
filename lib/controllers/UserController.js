const UserspaceMailer = require('../service/mailer/Mailer');
const crypto = require('crypto');
const User = require('../model/UserModel');
const EmailValidator = require('../service/InputValidators/EmailValidator');
const PasswordValidator = require('../service/InputValidators/PasswordValidator');
const UsernameValidator = require('../service/InputValidators/UsernameValidator');
const agenda = require('../service/agenda/agenda')
const ejs = require('ejs')
const {
    EmailAlreadyExistsError,
    UsernameAlreadyExistsError,
    WrongPasswordError,
    WrongLoginError,
    UserNotFound,
    UnknownUser,
    EmailAlreadyConfirmedError
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
    else if (req.query.username) checkUsernameAvailable(req, res, next);
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
    const emailAnalysis = EmailValidator.analyse(email);
    if (!emailAnalysis.isValid) {
        const notifications = emailAnalysis.notifications;
        res.json({ notifications: notifications });
        return;
    }
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
    const usernameAnalysis = UsernameValidator.analyse(username);
    if (!usernameAnalysis.isValid) {
        const notifications = usernameAnalysis.notifications;
        res.json({ notifications: notifications });
        return;
    }
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
        const exists = await User.userExists({ 'emailConfirmationCode': token })
        if (!exists) throw new UserNotFound("This link is no longer valid.");
        const user = await User.getUser({ 'emailConfirmationCode': token })
        await User.update({ email: user.email }, { 'emailConfirmationCode': null, 'emailConfirmed': true, });
        notifications.push({ type: 'success', message: 'Your email adress is now confirmed !' })
        ejs.renderFile(req.options.verifyEmailTemplate, notifications, {}, function (err, html) {
            if (err) {
                next(err);
            } else {
                res.send(html);
            }
        });
    } catch (err) {
        ejs.renderFile(req.options.verifyEmailTemplate, notifications, {}, function (err, html) {
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
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        emailConfirmationCode: generateToken(),
        extras: {}
    };

    for (let index in req.body) {
        if (index !== "username" && index !== "password" && index !== "confirmPassword" && index !== "email")
            user.extras[index] = req.body[index]
    }

    const emailAnalysis = EmailValidator.analyse(req.body.email);
    const usernameAnalysis = UsernameValidator.analyse(req.body.username);
    const passwordAnalysis = PasswordValidator.analyse(req.body.password, req.body.confirmPassword);
    if (!emailAnalysis.isValid || !usernameAnalysis.isValid || !passwordAnalysis.isValid) {
        notifications = notifications.concat(emailAnalysis.notifications);
        notifications = notifications.concat(usernameAnalysis.notifications);
        notifications = notifications.concat(passwordAnalysis.notifications);
        notifications.push({ type: 'error', message: 'Unvalid registration!' })
        res.json({ notifications: notifications });
        return;
    }
    try {
        const usernameExists = await User.userExists({ username: user.username })
        if (usernameExists) throw new UsernameAlreadyExistsError("Username already exists");
        const emailExists = await User.userExists({ email: user.email });
        if (emailExists) throw new EmailAlreadyExistsError("Email already exists");
        await User.createUser(user);
        const notifUserCreated = { type: 'success', message: 'User created!' }
        const error = {
            notifications: [
                { type: "error", message: "Confirmation email not sent, an error has occured." },
                notifUserCreated
            ]
        };
        error.notifications.push
        sendConfirmationEmail(req, user, user.emailConfirmationCode, req.headers.host, error);
        notifications.push(notifUserCreated);
        notifications.push({ type: 'info', message: 'You will receive a confirmation link at your email address in a few minutes.' })
        res.json({ notifications: notifications });
    } catch (err) {
        next(err)
    }
};

exports.resendConfirmationEmail = async function (req, res, next) {
    try {
        ensureLoggedIn(req);
        const notifications = [];
        const user = await User.getUser({ _id: req.user.id });
        if (user.emailConfirmed) {
            throw new EmailAlreadyConfirmedError("Your email adress has already been confirmed.")
        } else {
            sendConfirmationEmail(req, req.user, user.emailConfirmationCode, req.headers.host)
            notifications.push({ type: 'success', message: 'You will receive a confirmation link at your email address in a few minutes.' })
        }
        res.json({ notifications: notifications });
    } catch (err) {
        next(err)
    }
};

exports.updateUser = function (req, res, next) {
    if (req.body["passwordRecoveryToken"]) {
        updateUserPasswordWithToken(req, res, next);
    } else {
        ensureLoggedIn(req);
        updateUserLoggedIn(req, res, next);
    }
}

const updateUserPasswordWithToken = async function (req, res, next) {
    try {
        let notifications = [];
        const password = req.body.password;
        const confirmPassword = req.body.confirmPassword;
        if (password && confirmPassword) {
            const passwordAnalysis = PasswordValidator.analyse(password, confirmPassword);
            notifications = notifications.concat(passwordAnalysis.notifications);
        } else {
            notifications.push({ type: "error", message: "Please provide a new password and its confirmation!" })
        }

        if (notifications.length !== 0) return res.json({ notifications: notifications });

        const updatePasswordToken = req.body["passwordRecoveryToken"]
        if (updatePasswordToken) {
            const userExists = await User.userExists({ 'updatePasswordToken': updatePasswordToken })
            if (!userExists) throw new UserNotFound("Unvalid token!");
            const user = await User.getUser({ 'updatePasswordToken': updatePasswordToken })
            let resetDate = new Date(user.passwordUpdateRequestDate);
            let actualDate = new Date();
            let diff = Math.abs(actualDate - resetDate);
            let minutes = Math.floor((diff / 1000) / 60);
            if (minutes >= DELAY_TO_CHANGE_PASSWORD_IN_MINUTS)
                throw new UpdatePasswordTooLateError("This link has expired, please ask a new one.");
            await User.updateUser({ _id: user.id }, { password: password, updatePasswordToken: undefined, passwordUpdateRequestDate: undefined });
            notifications.push({ type: "success", message: "Your password is updated!" })
            return res.json({ notifications: notifications });
        }
    } catch (err) {
        next(err);
    }
}

const updateUserLoggedIn = async function (req, res, next) {
    try {
        let notifications = [];
        const userUpdates = {
            ...req.body,
            extras: {
                ...req.user.extras
            }
        };

        for (let index in req.body) {
            if (index !== "username" && index !== "password" && index !== "confirmPassword" && index !== "email" && index !== "previousPassword")
                userUpdates.extras[index] = req.body[index]
        }

        if (userUpdates.email && userUpdates.email !== req.user.email) {
            userUpdates.emailConfirmationCode = await generateToken();
            const emailAnalysis = EmailValidator.analyse(req.body.email);
            notifications = notifications.concat(emailAnalysis.notifications);
            const emailExists = await User.userExists({ email: userUpdates.email });
            if (emailExists) notifications.push({ type: 'error', message: 'This email already exists!' });
            else {
                sendConfirmationEmail(req, req.user, userUpdates.emailConfirmationCode, req.headers.host)
            }
        }

        if (userUpdates.username && userUpdates.username !== req.user.username) {
            const usernameAnalysis = UsernameValidator.analyse(req.body.username);
            notifications = notifications.concat(usernameAnalysis.notifications);
            const usernameExists = await User.userExists({ username: userUpdates.username });
            if (usernameExists) notifications.push({ type: 'error', message: 'This username already exists!' })
        }

        if (userUpdates.password && userUpdates.password !== req.body.previousPassword) {
            const passwordAnalysis = PasswordValidator.analyse(req.body.password, req.body.confirmPassword);
            notifications = notifications.concat(passwordAnalysis.notifications);
            if (req.body.previousPassword === undefined) {
                notifications.push({ type: 'error', message: 'Please provide your previous password!' })
            } else {
                const isValid = await User.isPasswordValid({ email: req.user.email }, req.body.previousPassword);
                if (!isValid) notifications.push({ type: 'error', message: 'Your previous password is wrong!' })
            }
        }

        if (notifications.length !== 0) return res.json({ notifications: notifications });

        await User.updateUser({ _id: req.user.id }, userUpdates);
        req.user = await User.getUserPublicInfos({ _id: req.user.id })
        notifications.push({ type: 'success', message: 'User information updated!' });

        const payload = await User.updateToken({ _id: req.user.id }, req.options.privateKey)

        res.json({
            ...payload,
            notifications
        })
    } catch (err) {
        next(err);
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
    agenda().now('email', {
        email: user.email,
        template: req.options.confirmEmailTemplate,
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
        const emailExists = User.userExists({ email: login })
        const usernameExists = User.userExists({ username: login });
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

    try {
        let exists = await User.userExists({ email: email });
        if (!exists)
            throw new UserNotFound("If your email address exists in our database, you will receive a password recovery link at your email address in a few minutes.");
        updatePasswordToken = generateToken();
        let passwordUpdateRequestDate = new Date();
        await User.update({ email: email }, { 'updatePasswordToken': updatePasswordToken, 'passwordUpdateRequestDate': passwordUpdateRequestDate });
        let user = await User.getUser({ email: email });
        agenda().now('email', {
            locals: {
                link: "http://" + req.headers.host + "/form/reset/password?token=" + updatePasswordToken,
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
