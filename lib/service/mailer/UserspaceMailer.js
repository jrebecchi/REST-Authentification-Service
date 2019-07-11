const nodemailer = require("nodemailer");
const fs = require('fs');
const {
    EmailNotSentError
} = require('../error/ErrorTypes');

module.exports.send = (req, params) => {
    const email = params.email;
    const subject = params.subject;
    const link = params.link;
    const template = params.template;
    const from = req.emailConfig.from;
    const transporter = nodemailer.createTransport(req.emailConfig);
    const error = params.error;
    fs.readFile(template, (err, content) => {
        if (err) throw err;
        const regexp = /<%[\s]*LINK[\s]*%>/;
        const html = content.replace(regexp, link);
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
      });
    
};
