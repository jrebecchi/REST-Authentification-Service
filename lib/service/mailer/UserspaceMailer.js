const nodemailer = require("nodemailer");
const ejs = require('ejs');
const {
    EmailNotSentError
} = require('../error/ErrorTypes');

module.exports.send = (req, params) => {
    return new Promise(function (resolve, reject) {
        const email = params.email;
        const subject = params.subject;
        const locals = params.locals;
        const template = params.template;
        const from = req.emailConfig.from;
        const transporter = nodemailer.createTransport(req.emailConfig);
        const error = params.error;
        ejs.renderFile(template, locals, {}, function (err, html) {
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
                        reject(new EmailNotSentError(err.message));
                    } else {
                        resolve(info);
                    }
                });
            }
        });
    });
};
