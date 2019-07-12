const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const Router = require('./router/Router');
const ErrorHandler = require('./service/error/ErrorHandler');
const db = require('./service/db/db');
const path = require('path');
const DEFAULT_CONFIRM_EMAIL_TEMPLATE = path.resolve(__dirname, './email-templates/ConfirmEmail.html');
const DEFAULT_RESET_PASSWORD_TEMPLATE = path.resolve(__dirname, './email-templates/ResetPassword.html')

exports = module.exports = createApplication;

/**
 * Create a REST-authentification application.
 *
 * @return {Express app}
 * @api public
 */

function createApplication(emailConfig, dbConfig, options) {
    if (!options) options = {};
    //options.privatekey
    //options.publickey
    //search for private & public key and if it does not find one create private & public ones
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



