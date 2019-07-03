exports.getLogout = function (req, res){
    req.logout();
    res.redirect('/');
};

exports.getLogin = function (req, res){
    if(req.user !== undefined){
        req.flash('error', "Oups, you are already logged in !");
        res.redirect('/dashboard');
        return;
    }
    res.render('pages/login.ejs',  {csrfToken: req.csrfToken()});
};

exports.getRegister = function (req, res){
    if(req.user !== undefined){
        req.flash('error', "To register a new account you need to deconnect yourself !");
        res.redirect('/dashboard');
        return;
    }
    res.render('pages/register.ejs', {
        email: req.query.email, 
        username: req.query.username, 
        lastName:req.query.lastName, 
        firstName:req.query.firstName,
        csrfToken: req.csrfToken()
    });
};

exports.postLogin = function (req, res){
    if(!req.body.remember) {
        req.session.cookie.expires = false; // Cookie expires at end of session
    }
    res.redirect('/dashboard');
};

exports.getSettings = function (req, res){
    res.render('pages/settings.ejs', { user: req.user, csrfToken: req.csrfToken() });
};
