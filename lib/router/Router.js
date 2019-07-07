const UserController = require("../controller/UserController.js.js");
const PasswordResetController  = require("../controller/PasswordResetController.js.js");
const UserspaceController  = require("../controller/UserspaceController.js.js");
const passport = require('passport');
const proxy = require('connect-ensure-login');
const express = require('express');
const router = express.Router();

router.get('/register', function(req, res) {
    UserspaceController.getRegister(req, res);
});
router.get('/login', function(req, res) {
    UserspaceController.getLogin(req, res);
});
router.get('/email-exists', function(req, res, next) {
    UserController.getCheckEmailExists(req, res, next);
});
router.get('/username-exists', function(req, res, next) {
    UserController.getCheckUsernameExists(req, res, next);
});
router.post('/register', function(req, res, next) {
    UserController.postCreateUser(req, res, next);
});
router.post('/login', function(req, res) {
    UserspaceController.postLogin(req, res);
});

router.get('/logout', function(req, res){
    UserspaceController.getLogout(req, res);
});

router.get('/publickey', function(req, res){
    UserspaceController.getPublicKey(req, res);
});

router.get('/send_confirmation_email', proxy.ensureLoggedIn(),function(req, res, next){
    UserController.getSendConfirmationEmail(req, res, next);
});

router.post('/password_reset', function(req, res, next){
    PasswordResetController.postResetPassword(req, res, next);
});

router.get('/password_reset', function(req, res, next){
    PasswordResetController.getShowPasswordRecoveryForm(req, res);
});

router.get('/password_renew', function(req, res, next){
    PasswordResetController.getShowChangePasswordForm(req, res);
});

router.post('/password_renew', function(req, res, next){
    PasswordResetController.postChangePassword(req, res, next);
});
router.get('/confirm_email', function(req, res, next){
    UserController.getConfirmEmail(req, res, next);
});
router.get('/settings', proxy.ensureLoggedIn(),function(req, res){
    UserspaceController.getSettings(req, res);
});
router.put('/modify-password', proxy.ensureLoggedIn(),function(req, res, next){
    UserController.putUpdatePassword(req, res, next);
});
router.put('/modify-username', proxy.ensureLoggedIn(),function(req, res, next){
    UserController.putUpdateUsername(req, res, next);
});
router.put('/modify-email', proxy.ensureLoggedIn(),function(req, res, next){
    UserController.putUpdateEmail(req, res, next);
});
router.put('/modify-extras', proxy.ensureLoggedIn(),function(req, res, next){
    UserController.putUpdatExtras(req, res, next);
});
router.delete('/delete-account', proxy.ensureLoggedIn(),function(req, res, next){
    UserController.deleteUser(req, res, next);
});

module.exports = router;