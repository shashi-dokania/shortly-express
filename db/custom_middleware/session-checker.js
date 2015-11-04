module.exports = function(args){
  //var loginUrl = args.loginUrl !== undefined ? args.loginUrl : '/login';

  // return function(req, res, next){
  //   if(req.session.user === undefined && req.url !== '/signup'){
  //     req.url = loginUrl;
  //   }
  //   next();
  // };
  return function(req, res, next) {
    console.log(req.url);
    if (req.isAuthenticated() || req.url === '/login' || req.url === '/auth/github'
      || req.path === '/auth/github/callback') { 
      console.log(req.isAuthenticated());
      return next(); 
    }
    res.redirect('/login')
  }

};
