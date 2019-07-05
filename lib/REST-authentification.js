const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const Router = require('./router/Router');
const ErrorHandler = require('./service/error/ErrorHandler');
const db = require('./lib/service/db/db')


exports = module.exports = createApplication;

/**
 * Create a REST-authentification application.
 *
 * @return {Function}
 * @api public
 */

function createApplication(secretOrPrivateKey, emailConfig, dbOptions) {
    const app = express();
    db.init();
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());
    app.use(morgan('combined'));
    app.use(helmet());
    app.use(Router);
    app.use(ErrorHandler);
    app.use(function (err, req, res, next) {
        console.log(err);
        console.log(req);
        req.flash('error', 'A mistake has happened. Sorry for the inconvenience, we are going to investigate it');
        res.redirect('/');
    });
    return app;
}

//Enter your mongoDB database connection options for the userspace



