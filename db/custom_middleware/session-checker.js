module.exports = function(args){
  var loginUrl = args.loginUrl !== undefined ? args.loginUrl : '/login';

  return function(req, res, next){
    if(req.session.user === undefined && req.url !== '/signup'){
      req.url = loginUrl;
    }
    next();
  };

};
