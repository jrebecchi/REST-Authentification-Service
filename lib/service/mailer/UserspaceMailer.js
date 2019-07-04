const nodemailer = require("nodemailer");
const ejs = require('ejs');
const {
    EmailNotSentError
} = require('../error/ErrorTypes');

module.exports.send = function(params){
    const email = params.email; 
    const subject = params.subject;
    const template = params.template; 
    const locals = params.locals;
    const from = global.userspaceMailOptions; 
    const transporter = nodemailer.createTransport(global.userspaceMailOptions);
    const error = params.error;
    return new Promise(function(resolve, reject) {
        ejs.renderFile(template, locals, {},function (err, html) {
            if (err) {
                reject(err);
            } else {
                const mailOptions = {
                    from: from,
                    to: email,
                    subject: subject,
                    html: html
                };
                transporter.sendMail(mailOptions, function(err, info) {
                    if (err) {
                        reject(new EmailNotSentError(error.redirection, error.flashMessage));
                    } else {
                        resolve(info);
                    }
                });
            }
        });
    });
};
