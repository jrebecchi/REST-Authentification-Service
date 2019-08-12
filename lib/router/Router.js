const UserController = require("../controllers/UserController");
const PasswordResetController = require("../controllers/PasswordResetController");
const MiscellaneousController = require("../controllers/MiscellaneousController");
const express = require('express');
const router = express.Router();

router.get('/', function (req, res, next) {
    MiscellaneousController.getIndex(req, res, next);
});
router.post('/user/login', function (req, res, next) {
    UserController.postLogin(req, res, next);
});
router.get('/user/available', function (req, res, next) {
    UserController.checkCredentialAvailable(req, res, next);
});
router.get('/user/logout', function (req, res) {
    UserspaceController.getLogout(req, res);
});
router.get('/publickey', function (req, res) {
    MiscellaneousController.getPublicKey(req, res);
});
router.get('/user/email-confirmation', function (req, res, next) {
    UserController.getSendConfirmationEmail(req, res, next);
});

router.post('/user', function (req, res, next) {
    UserController.postCreateUser(req, res, next);
});
router.get('/user/password-recovery', function (req, res, next) {
    PasswordResetController.postResetPassword(req, res, next);
});

router.patch('/user', function (req, res, next) {
    UserController.updateUser(req, res, next);
});

router.delete('/user',function (req, res, next) {
    UserController.deleteUser(req, res, next);
});

module.exports = router;