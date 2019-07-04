const mongoose = require( 'mongoose' );

module.exports.init = (cb) => {
    let connectionString;
    if(global.userDBOptions){
        connectionString= 'mongodb://' +
            global.userDBOptions.hostname + ':' +
            global.userDBOptions.port + '/' +
            global.userDBOptions.database;
    } else {
        connectionString = 'mongodb://localhost:27017/user_management';
    }

    // Create the database connection
    mongoose.connect(connectionString, { useNewUrlParser: true });

    // Get Mongoose to use the global promise library
    mongoose.Promise = global.Promise;

    // CONNECTION EVENTS
    // When successfully connected
    mongoose.connection.on('connected', function () {
        console.log('Mongoose default connection open to ' + connectionString);
        if(cb !== undefined){
            cb();
        }
    });

    // If the connection throws an error
    mongoose.connection.on('error',function (err) {
        console.log('Mongoose default connection error: ' + err);
    });

    // When the connection is disconnected
    mongoose.connection.on('disconnected', function () {
        console.log('Mongoose default connection disconnected');
    });

    // If the Node process ends, close the Mongoose connection
    process.on('SIGINT', function() {
        mongoose.connection.close(function () {
            console.log('Mongoose default connection disconnected through app termination');
            process.exit(0);
        });
    });
}

module.exports.close = (cb) => {
    mongoose.connection.close(() => cb());
}

