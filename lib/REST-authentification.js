const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const Router = require('./router/Router');
const ErrorHandler = require('./service/error/ErrorHandler');
const db = require('./service/db/db');
const agenda = require('./service/agenda/agenda');
const path = require('path');
const UserModel = require('./model/UserModel');
const multer = require('multer');
const fs = require('fs');
const mailer = require('./service/mailer/Mailer');
const { generateKeys } = require('./service/crypto/RSAKeysGeneration');

const DEFAULT_RESET_PASSWORD_FORM_TEMPLATE = path.resolve(__dirname, './templates/forms/ResetPassword.ejs');
const DEFAULT_VERIFY_EMAIL_TEMPLATE = path.resolve(__dirname, './templates/emails/VerifyEmail.ejs');
const DEFAULT_RESET_PASSWORD_TEMPLATE = path.resolve(__dirname, './templates/emails/ResetPassword.ejs')
const DEFAULT_NOTIFICATION_PAGE_TEMPLATE = path.resolve(__dirname, './templates/pages/Notification.ejs');
const DEFAULT_PUBLIC_KEY_FILE = path.resolve(__dirname, './public-key.txt');
const DEFAULT_PRIVATE_KEY_FILE = path.resolve(__dirname, './private-key.txt');
const DEFAULT_EMAIL_NOT_SENT_LOG_FILE = path.resolve(__dirname, './email-not-sent.log');
const DEFAULT_DB_CONFIG = {
    adress: 'localhost',
    port: '27017',
    agendaDB: 'agenda',
    userDB: 'users'
}

exports = module.exports = createApplication;

/**
 * Create a REST-authentification application.
 *
 * @return {Express app}
 * @api public
 */

function createApplication(options) {
    if (!options) options = {};

    options.dbConfig = {...DEFAULT_DB_CONFIG,...options.dbConfig};

    if (options.publicKey === undefined || options.privateKey === undefined) {
        if (options.publicKeyFilePath !== undefined || options.privateKeyFilePath !== undefined) {
            options.publicKey = fs.readFileSync(options.publicKeyFilePath).toString();
            options.privateKey = fs.readFileSync(options.privateKeyFilePath).toString();
        } else if (fs.existsSync(DEFAULT_PUBLIC_KEY_FILE) && fs.existsSync(DEFAULT_PRIVATE_KEY_FILE)) {
            options.publicKey = fs.readFileSync(DEFAULT_PUBLIC_KEY_FILE).toString();
            options.privateKey = fs.readFileSync(DEFAULT_PRIVATE_KEY_FILE).toString();
        } else {
            const { publicKey, privateKey } = generateKeys();
            fs.writeFileSync(DEFAULT_PRIVATE_KEY_FILE, privateKey, (err) => console.log(err));
            fs.writeFileSync(DEFAULT_PUBLIC_KEY_FILE, publicKey, (err) => console.log(err));
            options.publicKey = publicKey;
            options.privateKey = privateKey;
        }
    }

    if (options.hasUsername === undefined) {
        options.hasUsername = true;
    }

    if (options.emailNotSentLogFile === undefined) {
        options.emailNotSentLogFile = DEFAULT_EMAIL_NOT_SENT_LOG_FILE;
    }

    if (options.verifyEmailTemplate === undefined) {
        options.verifyEmailTemplate = DEFAULT_VERIFY_EMAIL_TEMPLATE;
    } else {
        options.verifyEmailTemplate = options.verifyEmailTemplate;
    }

    if (options.resetPasswordEmailTemplate === undefined) {
        options.resetPasswordEmailTemplate = DEFAULT_RESET_PASSWORD_TEMPLATE;
    } else {
        options.resetPasswordEmailTemplate = options.resetPasswordEmailTemplate;
    }

    if (options.resetPasswordFormTemplate === undefined) {
        options.resetPasswordFormTemplate = DEFAULT_RESET_PASSWORD_FORM_TEMPLATE;
    } else {
        options.resetPasswordFormTemplate = options.resetPasswordEmailTemplate;
    }

    if (options.notificationPageTemplate === undefined) {
        options.notificationPageTemplate = DEFAULT_NOTIFICATION_PAGE_TEMPLATE;
    } else {
        options.notificationPageTemplate = options.notificationPageTemplate;
    }

    const app = express();

    db.init(options);
    agenda.init(options);
    mailer.init(options);
    UserModel.init(options);

    app.use((req, res, next) => {
        req.options = options;
        next();
    });
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(multer().none());
    app.use(morgan('combined'));
    app.use(helmet());
    app.use(async (req, res, next) => {
        const bearerHeader = req.headers['authorization'];
        if (typeof bearerHeader !== 'undefined') {
            const bearer = bearerHeader.split(' ');
            const bearerToken = bearer[1];
            try {
                const user = await UserModel().verify(bearerToken, req.options.publicKey);
                req.user = user;
                next();
            } catch (err) {
                next(err);
            }
        } else {
            next();
        }
    });
    app.use(Router);
    app.use(ErrorHandler);

    app.use(function (err, req, res, next) {
        console.log(err);
        const notifications = [];
        notifications.push({ type: 'error', message: 'A mistake has happened. Sorry for the inconvenience, we are going to investigate it.' })
        res.json({ notifications: notifications });
    });
    return app;
}

//Enter your mongoDB database connection options for the userspace



