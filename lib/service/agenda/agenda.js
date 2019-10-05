const Agenda = require('agenda');

module.exports = (adress, db, collection) => {
    if (this.agenda === undefined) {
        if (!adress) adress = 'mongodb://localhost:27017';
        if (!db) db = 'agenda';
        if (!collection) collection = 'jobs';
        const connectionOpts = { db: { address: adress + "/" + db, collection: collection } };
        this.agenda = new Agenda(connectionOpts);
        require('./../../jobs/email')(this.agenda);

        this.agenda.start()
            .then(() => console.log('Agenda default connection open to ' + adress + "/" + db))
            .catch(err => console.log('Agenda default connection error: ' + err));
    }
    return this.agenda
}

module.exports.init = () => module.exports();