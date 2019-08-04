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
router.get('/user/email-confirmation', ensureLoggedIn, function (req, res, next) {
    UserController.getSendConfirmationEmail(req, res, next);
});
// router.get('/user/email-validation', function (req, res, next) {
//     UserController.getConfirmEmail(req, res, next);
// });
router.post('/user', function (req, res, next) {
    UserController.postCreateUser(req, res, next);
});
router.post('/user/password-recovery', function (req, res, next) {
    PasswordResetController.postResetPassword(req, res, next);
});
// router.put('/user/password', function (req, res, next) {
//     PasswordResetController.postChangePassword(req, res, next);
// });
router.patch('/user', ensureLoggedIn, function (req, res, next) {
    UserController.updateUser(req, res, next);
});
// router.patch('/modify-password', ensureLoggedIn,function (req, res, next) {
//     UserController.putUpdatePassword(req, res, next);
// });
// router.put('/modify-username', ensureLoggedIn,function (req, res, next) {
//     UserController.putUpdateUsername(req, res, next);
// });
// router.put('/modify-email', ensureLoggedIn,function (req, res, next) {
//     UserController.putUpdateEmail(req, res, next);
// });
// router.put('/modify-extras', ensureLoggedIn,function (req, res, next) {
//     UserController.putUpdatExtras(req, res, next);
// });
router.delete('/user', ensureLoggedIn,function (req, res, next) {
    UserController.deleteUser(req, res, next);
});

module.exports = router;