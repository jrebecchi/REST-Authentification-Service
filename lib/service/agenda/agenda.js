const Agenda = require('agenda');

module.exports = (options) => {
    if (this.agenda === undefined) {
        let connectionString = 'mongodb://' +
            options.dbConfig.adress + ':' +
            options.dbConfig.port + '/' +
            options.dbConfig.agendaDB;
        let collection = 'jobs';
        const connectionOpts = { db: { address: connectionString, collection: collection } };
        this.agenda = new Agenda(connectionOpts);
        require('./../../jobs/email')(this.agenda, options);

        this.agenda.start()
            .then(() => console.log('Agenda default connection open to ' + connectionString))
            .catch(err => console.log('Agenda default connection error: ' + err));
    }
    return this.agenda
}

module.exports.init = (options) => module.exports(options);