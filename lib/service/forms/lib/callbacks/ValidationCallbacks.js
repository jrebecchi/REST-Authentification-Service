const USERNAME_LENGTH = 4;
const PASSWORD_LENGTH = 8;
const NAME_LENGTH = 2;

exports.testUsername = function(username){
    const re = /^[a-zA-Z0-9\-_.]*$/;
    let hasError = false;
    let errorMsg = "";
    if(username.length < USERNAME_LENGTH){
        hasError=true;
        errorMsg = "The username must contains more than 4 characters !";
    }
    else if(!re.test(username)){
        hasError=true;
        errorMsg = "Username may only contain letters, numbers, dashes, dots and underscores !";
    }
    return {hasError, errorMsg}
}
    
exports.testEmail = function(email){
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    let hasError = false;
    let errorMsg = "";
    if(!re.test(email)){
        hasError=true;
        errorMsg = "The email adress is not valid !";
    }
    return {hasError, errorMsg}
}

exports.testPassword = function(password){
    let hasError = false;
    let errorMsg = "";
    if(password.length < PASSWORD_LENGTH){
        hasError=true;
        errorMsg = "The password must contains more than "+PASSWORD_LENGTH+" characters !";
    }
    return {hasError, errorMsg}
}
    
exports.testConfirmPassword = function(confirmPassword, password){
    let hasError = false;
    let errorMsg = "";
    if(!(confirmPassword === password)){
        hasError=true;
        errorMsg = "The passwords don't match !";
    }
    return {hasError, errorMsg}
}
    
exports.testName = function(name){
    const re = /^[a-zA-z]+([ '\-][a-zA-Z]+)*$/;
    let hasError = false;
    let errorMsg = "";
    if(name.length < NAME_LENGTH){
        hasError=true;
        errorMsg = "The name must contains more than 2 characters !";
    }
    else if(!re.test(name)){
        hasError=true;
        errorMsg = "Uncorrect name !";
    }
    return {hasError, errorMsg}
}
    
exports.testImperativeCheckBox = function(checkBoxValue){
    let hasError = false;
    let errorMsg = "";
    if(!checkBoxValue){
        hasError=true;
        errorMsg = "You must agree with the terms of service !";
    }
    return {hasError, errorMsg};
}