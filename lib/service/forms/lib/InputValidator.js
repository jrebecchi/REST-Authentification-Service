module.exports  = function(){
    this.errorMsg = "";
    this.hasError;
    
    this.testInput = function(inputTesterCallback, param1, param2){
        const result = inputTesterCallback(param1, param2);
        this.hasError = result.hasError;
        this.errorMsg = result.errorMsg;
    };
};