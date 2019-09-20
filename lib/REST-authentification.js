const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const Router = require('./router/Router');
const ErrorHandler = require('./service/error/ErrorHandler');
const db = require('./service/db/db');
const path = require('path');
const UserModel = require('./model/UserModel');
const fs = require('fs');
const { generateKeys } = require('./service/crypto/RSAKeysGeneration');
const DEFAULT_CONFIRM_EMAIL_TEMPLATE = path.resolve(__dirname, './email-templates/ConfirmEmail.ejs');
const DEFAULT_RESET_PASSWORD_TEMPLATE = path.resolve(__dirname, './email-templates/ResetPassword.ejs')
const DEFAULT_PUBLIC_KEY_FILE = path.resolve(__dirname, './public-key.txt');
const DEFAULT_PRIVATE_KEY_FILE = path.resolve(__dirname, './private-key.txt');

exports = module.exports = createApplication;

/**
 * Create a REST-authentification application.
 *
 * @return {Express app}
 * @api public
 */

function createApplication(emailConfig, dbConfig, options) {
    if (!options) options = {};

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

    if (options.confirmEmailTemplate === undefined) {
        options.confirmEmailTemplate = DEFAULT_CONFIRM_EMAIL_TEMPLATE;
    } else {
        options.confirmEmailTemplate = options.confirmEmailTemplate;
    }

    if (options.resetPasswordEmailTemplate === undefined) {
        options.resetPasswordEmailTemplate = DEFAULT_RESET_PASSWORD_TEMPLATE;
    } else {
        options.resetPasswordEmailTemplate = options.resetPasswordEmailTemplate;
    }

    const app = express();
    db.init(dbConfig);
    app.use((req, res, next) => {
        req.options = options;
        req.emailConfig = emailConfig;
        next();
    });
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use(morgan('combined'));
    app.use(helmet());
    app.use(async (req, res, next) => {
        const bearerHeader = req.headers['authorization'];
        if (typeof bearerHeader !== 'undefined') {
            const bearer = bearerHeader.split(' ');
            const bearerToken = bearer[1];
            try {
                const user = await UserModel.verify(bearerToken, req.options.publicKey);
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



