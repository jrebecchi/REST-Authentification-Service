const UserController = require("../controllers/UserController");
const PasswordResetController = require("../controllers/PasswordResetController");
const MiscellaneousController = require("../controllers/MiscellaneousController");
const express = require('express');
const router = express.Router();
const { UnknownUser } = require('../service/error/ErrorTypes');

const ensureLoggedIn = (req, res, next) => {
    if (req.user === undefined ) throw new UnknownUser('Please login!');
    else next();
}
router.get('/', function (req, res, next) {
    MiscellaneousController.getIndex(req, res, next);
});
router.get('/exists', function (req, res, next) {
    UserController.getCheckCredentialsExists(req, res, next);
});
router.get('/logout', function (req, res) {
    UserspaceController.getLogout(req, res);
});
router.get('/publickey', function (req, res) {
    MiscellaneousController.getPublicKey(req, res);
});
router.get('/send_email_confirmation', ensureLoggedIn, function (req, res, next) {
    UserController.getSendConfirmationEmail(req, res, next);
});
router.get('/confirm_email', function (req, res, next) {
    UserController.getConfirmEmail(req, res, next);
});
router.post('/register', function (req, res, next) {
    UserController.postCreateUser(req, res, next);
});
router.post('/password_reset', function (req, res, next) {
    PasswordResetController.postResetPassword(req, res, next);
});
router.post('/password_renew', function (req, res, next) {
    PasswordResetController.postChangePassword(req, res, next);
});
router.post('/login', function (req, res, next) {
    UserController.postLogin(req, res, next);
});
router.put('/modify-password', ensureLoggedIn,function (req, res, next) {
    UserController.putUpdatePassword(req, res, next);
});
router.put('/modify-username', ensureLoggedIn,function (req, res, next) {
    UserController.putUpdateUsername(req, res, next);
});
router.put('/modify-email', ensureLoggedIn,function (req, res, next) {
    UserController.putUpdateEmail(req, res, next);
});
router.put('/modify-extras', ensureLoggedIn,function (req, res, next) {
    UserController.putUpdatExtras(req, res, next);
});
router.delete('/delete-account', ensureLoggedIn,function (req, res, next) {
    UserController.deleteUser(req, res, next);
});

module.exports = router;