const nodemailer = require("nodemailer");
const {
    EmailNotSentError
} = require('../error/ErrorTypes');

module.exports.send = (req, params) => {
    const email = params.email;
    const subject = params.subject;
    const template = params.template;
    const locals = params.locals;
    const from = global.userspaceMailOptions;
    const transporter = nodemailer.createTransport(req.emailConfig);
    const error = params.error;
    return new Promise(function (resolve, reject) {
        if (err) {
            reject(err);
        } else {
            const mailOptions = {
                from: from,
                to: email,
                subject: subject,
                html: html
            };
            transporter.sendMail(mailOptions, function (err, info) {
                if (err) {
                    reject(new EmailNotSentError(error.message));
                } else {
                    resolve(info);
                }
            });
        }
    });
};
