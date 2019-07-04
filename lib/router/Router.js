const UserController = require("../controller/UserController.js");
const PasswordResetController  = require("../controller/PasswordResetController.js");
const UserspaceController  = require("../controller/UserspaceController.js");
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
router.post('/login',
    passport.authenticate('local', {
        failureRedirect: '/login',
        failureFlash: 'Invalid email or password.', 
    }),
    function(req, res) {
        UserspaceController.postLogin(req, res);
});

router.get('/logout', function(req, res){
    UserspaceController.getLogout(req, res);
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
router.post('/modify-password', proxy.ensureLoggedIn(),function(req, res, next){
    UserController.postModifyPassword(req, res, next);
});
router.post('/modify-username', proxy.ensureLoggedIn(),function(req, res, next){
    UserController.postModifyUsername(req, res, next);
});
router.post('/modify-email', proxy.ensureLoggedIn(),function(req, res, next){
    UserController.postModifyEmail(req, res, next);
});
router.post('/modify-firstname', proxy.ensureLoggedIn(),function(req, res, next){
    UserController.postModifyFirstName(req, res, next);
});
router.post('/modify-lastname', proxy.ensureLoggedIn(),function(req, res, next){
    UserController.postModifyLastName(req, res, next);
});
router.post('/delete-account', proxy.ensureLoggedIn(),function(req, res, next){
    UserController.postDeleteAccount(req, res, next);
});

module.exports = router;