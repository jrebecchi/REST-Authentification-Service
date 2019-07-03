//App entry point
const express = require('express');
const app = express();
const path = require('path');
require('./config/config').init(app);

//Declare here your bundles
const userspaceBundle = require('./bundles/UserspaceBundle/UserspaceBundle');
const mainBundle = require('./bundles/MainBundle/MainBundle');
const myOwnBundle = require('./bundles/MyOwnBundle/MyOwnBundle');

//Enter your mongoDB database connection options for the userspace
global.userDBOptions = {
  hostname :"dbuser:dbpassword@host.com",
  port :"19150",
  database : "user_management"
};

require('./config/db').init();

//Enter your email options for the userspace from where will be sent the emails
//Check nodemailer confirguration for more options (https://nodemailer.com)
global.userspaceMailOptions = {
  from: 'myemail@myhost.com', //email address
  host: 'smtp.myhost.com', // hostname 
  secureConnection: true, // use SSL 
  port: 465, // port for secure SMTP 
  auth: {
    user: 'username', //email login
    pass: 'mypassword' //email password
  }
};

//Enable your bundles
userspaceBundle.init(app);
mainBundle.init(app);
myOwnBundle.init(app);

//Add the view folders of your bundle
app.set('views', [
  path.join(__dirname+'/bundles/MainBundle', 'views'), 
  path.join(__dirname+'/bundles/UserspaceBundle', 'views'),
  path.join(__dirname+'/bundles/MyOwnBundle', 'views')
]);

//Call Error handler
app.use(function (err, req, res, next) {
  console.log(err);
  console.log(req);
  req.flash('error', 'A mistake has happened. Sorry for the inconvenience, we are going to investigate it');
  res.redirect('/');
});

//Adapt to your server config
const http = require('http');
const server = http.createServer(app);
server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  const addr = server.address();
  console.log("Server listening at", addr.address + ":" + addr.port);
});
