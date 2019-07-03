const InputValidator = require("./lib/InputValidator");
const registrationCB = require("./lib/callbacks/ValidationCallbacks");

module.exports.isValid = function(req){
    let isFormValid = true;
    let iv = new InputValidator();

    iv.testInput(registrationCB.testEmail, req.body.email.trim()); 
    if(iv.hasError){
        req.flash('error',iv.errorMsg);
        isFormValid = false;
    }
    return isFormValid;
}