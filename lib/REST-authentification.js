const fs = require('fs');
const { generateKeys } = require('./service/crypto/RSAKeysGeneration');
const path = require('path');

const DEFAULT_PUBLIC_KEY_FILE = path.resolve(__dirname, './public-key.txt');
const DEFAULT_PRIVATE_KEY_FILE = path.resolve(__dirname, './private-key.txt');

/**
 * Create a REST-authentification application.
 *
 * @return {Express app}
 * @api public
 */

function createApplication(config) {
    if (!config) config = {};

    if (config.publicKey === undefined || config.privateKey === undefined) {
        if (config.publicKeyFilePath !== undefined || config.privateKeyFilePath !== undefined) {
            config.publicKey = fs.readFileSync(config.publicKeyFilePath).toString();
            config.privateKey = fs.readFileSync(config.privateKeyFilePath).toString();
        } else if (fs.existsSync(DEFAULT_PUBLIC_KEY_FILE) && fs.existsSync(DEFAULT_PRIVATE_KEY_FILE)) {
            config.publicKey = fs.readFileSync(DEFAULT_PUBLIC_KEY_FILE).toString();
            config.privateKey = fs.readFileSync(DEFAULT_PRIVATE_KEY_FILE).toString();
        } else {
            const { publicKey, privateKey } = generateKeys();
            fs.writeFileSync(DEFAULT_PRIVATE_KEY_FILE, privateKey, (err) => console.log(err));
            fs.writeFileSync(DEFAULT_PUBLIC_KEY_FILE, publicKey, (err) => console.log(err));
            config.publicKey = publicKey;
            config.privateKey = privateKey;
        }
    }
    let defaultConfig = require('./config');
    Object.keys(config).map(prop => {
        if (typeof (defaultConfig[prop]) === "object") {
            defaultConfig[prop] = {
                ...defaultConfig[prop], ...config[prop]
            }
        } else {
            defaultConfig[prop] = config[prop];
        }
    });
    const db = require('./service/db/db');
    db.init()

    const express = require('express');
    const bodyParser = require('body-parser');
    const morgan = require('morgan');
    const helmet = require('helmet');
    const Router = require('./router/Router');
    const ErrorHandler = require('./service/error/ErrorHandler');
    const UserModel = require('./model/UserModel');
    const multer = require('multer');
    const app = express();


    app.use((req, res, next) => {
        req.options = config;
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

exports = module.exports = createApplication;
