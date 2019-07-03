const InputValidator = require("./lib/InputValidator");
const registrationCB = require("./lib/callbacks/ValidationCallbacks");

module.exports.isValid = function(req){
    let isFormValid = true;
    let iv = new InputValidator();
    iv.testInput(registrationCB.testUsername, req.body.username.trim()); 
    if(iv.hasError){
        req.flash('error',iv.errorMsg);
        isFormValid = false;
    }
    iv.testInput(registrationCB.testEmail,req.body.email.trim());
    if(iv.hasError){
        req.flash('error',iv.errorMsg);
        isFormValid = false;
    }        
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
    iv.testInput(registrationCB.testName,req.body.first_name.trim());
    if(iv.hasError){
        req.flash('error',iv.errorMsg);
        isFormValid = false;
    }           
    iv.testInput(registrationCB.testName,req.body.last_name.trim());
    if(iv.hasError){
        req.flash('error',iv.errorMsg);
        isFormValid = false;
    }             
    iv.testInput(registrationCB.testImperativeCheckBox,req.body.conditions);
    if(iv.hasError){
        req.flash('error',iv.errorMsg);
        isFormValid = false;
    }
    return isFormValid;
};