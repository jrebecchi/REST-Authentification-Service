const PassportAuthentification = require('./service/authentification/PassportAuthentification');
const Router = require('./router/Router');
const ErrorHandler = require('./service/error/ErrorHandler');


exports.init = function(app, emailConfig, dbOptions) {
    //Init services
    PassportAuthentification.init();

    //Launch rooter
    app.use(Router);

    //Launch Error handler
    app.use(ErrorHandler);
};