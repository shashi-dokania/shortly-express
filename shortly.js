var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var sessionChecker = require('./db/custom_middleware/session-checker');
var passport = require('passport');
var gitHubOAuth = require('passport-github2').Strategy;

// TODO SAVE SESSION TO DB
// var BookshelfStore = require('connect-bookshelf')(session);

var GITHUB_CLIENT_ID = "f43b006540281a95b925";
var GITHUB_CLIENT_SECRET = "52a0a9c2bd4634cbf23dd62c49395b6fcbc3fd7e";
// GitHub Token
// 29840100a1277e07924149a60f68bc147e6a22e5 

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Session = require('./app/models/session');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

// var sessionStore = new knexSessionStore({knex: db.knex});

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(cookieParser('this is not really secret'));
app.use(session({
  secret: 'this is not really secret',
  // TODO SAVE SESSION TO DB
  // store: new BookshelfStore({model: Session}),
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } 
}));

app.use(passport.initialize());
app.use(passport.session());


app.use(express.static(__dirname + '/public'));

app.use(sessionChecker());
// app.use(sessionChecker({
//   loginUrl: '/login'
// }));









passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new gitHubOAuth({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: "http://127.0.0.1:4568/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    console.log(done);
    process.nextTick(function () {
      
      // To keep the example simple, the user's GitHub profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the GitHub account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));











// GET /auth/github
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in GitHub authentication will involve redirecting
//   the user to github.com.  After authorization, GitHub will redirect the user
//   back to this application at /auth/github/callback
app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] }),
  function(req, res){
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
  });

// GET /auth/github/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });














app.get('/', 
function(req, res) {
  // console.log(''req.session.user)
  //if( req.session.user ){
  res.render('index');
  // } else {
    // res.render('login');
  // }
});

app.get('/create', 
function(req, res) {
  res.render('index');
});

app.get('/links', 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        Links.create({
          url: uri,
          title: title,
          base_url: req.headers.origin
        })
        .then(function(newLink) {
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/signup',
function(req, res) {
  res.render('signup');
});

app.get('/login',
function(req, res) {
  res.render('login');
});

app.post('/signup', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  var salt = bcrypt.genSaltSync(10);
  var hash = bcrypt.hashSync(password, salt);
  
  new User({  
    // The query will match these parameters
    'username': username,
    'hash': hash,
    'salt': salt
    // Will return row with ID 1
  }).save().then(function(updatedModel) {
    console.log('User created!');
    res.redirect('/login');
    //res.end();
  }).catch(function(err) {
    console.log('Error creating new user', err);
  });
});

app.post('/login', function(request, response) {
 
  var username = request.body.username;
  var password = request.body.password;
 
  var user = new User({  
    // Query params 
    'username': username
  }).fetch().then(function(userData){
      // Do stuff with fetchedModel
      console.log(userData);
      var hash = bcrypt.hashSync(password, userData.attributes.salt);
      if( hash === userData.attributes.hash){
        request.session.regenerate(function(){
          request.session.user = username;
          response.redirect('/');
        });
      } else {
        console.log('Username or password not matched')
        response.redirect('/login');
      }
  }).catch(function(err) {
    console.log('Error retriving user', err);
    response.redirect('/login'); 
  });
  
});

app.get('/logout', function(request, response) {
  // request.session.destroy();
  // response.setHeader("Content-Type", "text/html");
  // response.redirect('/login');
  //response.render('login');
  //response.end();
  request.logout();
  response.redirect('/login');
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits')+1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
