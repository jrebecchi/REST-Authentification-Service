const InputValidator = require("./lib/InputValidator");
const registrationCB = require("./lib/callbacks/ValidationCallbacks");

module.exports.isValid = (req, res) => {
    let isFormValid = true;
    let iv = new InputValidator();
    iv.testInput(registrationCB.testPassword,req.body.password);
    if(iv.hasError){
        req.flash('error',iv.errorMsg);
        isFormValid = false;
    }         
    iv.testInput(registrationCB.testConfirmPassword,req.body.confirm_password, req.body.password);
    if(iv.hasError){
        req.flash('error',iv.errorMsg);
        isFormValid = false;
    }   
    iv.testInput(registrationCB.testEmail,req.body.email);
    return isFormValid;
};