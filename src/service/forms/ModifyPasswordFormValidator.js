const InputValidator = require("./lib/InputValidator");
const registrationCB = require("./lib/callbacks/ValidationCallbacks");

module.exports.isValid = function(req){
    let isFormValid = true;
    let iv = new InputValidator();
    let newPassword = req.body.password;
    let confirmNewPassword = req.body.confirm_password;
    iv.testInput(registrationCB.testPassword, newPassword, confirmNewPassword); 
    if (iv.hasError){
        req.flash('error',iv.errorMsg);
        isFormValid = false;
    }
    iv.testInput(registrationCB.testConfirmPassword, confirmNewPassword, newPassword); 
    if (iv.hasError){
        req.flash('error',iv.errorMsg);
        isFormValid = false;
    }
    return isFormValid;
}