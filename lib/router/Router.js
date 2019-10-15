const UserController = require("../controllers/UserController");
const MiscellaneousController = require("../controllers/MiscellaneousController");
const express = require('express');
const router = express.Router();

router.get('/', MiscellaneousController.getIndex);
router.get('/publickey', MiscellaneousController.getPublicKey);

router.get('/mailer/user/account/recovery', UserController.sendPasswordRecoveryEmail);
router.get('/mailer/user/verification', UserController.resendConfirmationEmail);

router.get('/user/available', UserController.checkCredentialAvailable);
router.get('/user/email/confirmation', UserController.confirmEmail);
router.post('/user', UserController.createUser);
router.post('/user/token', UserController.getAuthToken);
router.patch('/user', UserController.updateUser);
router.delete('/user', UserController.deleteUser);

router.get('/form/reset/password', UserController.resetPasswordForm);

module.exports = router;