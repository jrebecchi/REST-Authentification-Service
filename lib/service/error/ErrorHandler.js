const {
    OperationalError,
    UserNotFound
} = require('./ErrorTypes')

module.exports = function (err, req, res, next){
    if (err instanceof OperationalError && err.redirection !== undefined){
            if (err.flashMessage !== undefined){
                req.flash(err.flashMessage.type, err.flashMessage.message); 
            }
            res.redirect(err.redirection);
    } else if (err instanceof UserNotFound){
        console.log(err);
        req.flash('error', 'User not found');
        req.logout();
        res.redirect("/login");
    } else {
        next(err);
    }
};