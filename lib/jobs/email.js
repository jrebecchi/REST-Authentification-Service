let mailer = require('../service/mailer/Mailer');

module.exports = function (agenda) {
    agenda.define('email', async job => {
        mailer.send(job.attrs.data);
    });

};