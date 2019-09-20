const UserController = require("../controllers/UserController");
const MiscellaneousController = require("../controllers/MiscellaneousController");
const express = require('express');
const router = express.Router();

router.get('/', function (req, res, next) {
    MiscellaneousController.getIndex(req, res, next);
});
router.post('/user/token', function (req, res, next) {
    UserController.getAuthToken(req, res, next);
});
router.get('/user/available', function (req, res, next) {
    UserController.checkCredentialAvailable(req, res, next);
});

router.get('/publickey', function (req, res) {
    MiscellaneousController.getPublicKey(req, res);
});

router.get('/user/email/confirmation', function (req, res, next) {
    UserController.sendConfirmationEmail(req, res, next);
});

router.get('/mailer/user/email/verification', function (req, res, next) {
    UserController.sendConfirmationEmail(req, res, next);
});

router.post('/user', function (req, res, next) {
    UserController.createUser(req, res, next);
});

router.get('/mailer/user/account/recovery', function (req, res, next) {
    UserController.sendPasswordRecoveryEmail(req, res, next);
});

router.patch('/user', function (req, res, next) {
    UserController.updateUser(req, res, next);
});

router.delete('/user',function (req, res, next) {
    UserController.deleteUser(req, res, next);
});

module.exports = router;