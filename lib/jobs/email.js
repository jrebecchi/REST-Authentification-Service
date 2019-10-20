const mailer = require('../service/mailer/Mailer');
const fs = require('fs');

module.exports = function (agenda, options) {
    agenda.define('email', async job => {
        try {
            await mailer.send(job.attrs.data);
        } catch (err) {
            console.log(err);
            fs.appendFile(options.emailNotSentLogFile, JSON.stringify(job.attrs.data), function (err) {
                if (err) throw err;
                console.log('Saved!');
            });
            options.emailNotSentLogFile
        }
    });

};