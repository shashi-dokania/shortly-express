var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var knexSessionStore = require('connect-session-knex')(session);

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var sessionStore = new knexSessionStore({knex: db.knex});

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
  store: sessionStore,
  //cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } 
}));
app.use(express.static(__dirname + '/public'));


app.get('/', 
function(req, res) {
  console.log(sessionStore);
  res.render('index');
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
  
  // var userObj = db.users.findOne({ username: username, password: hash });
  new User({  
    // The query will match these parameters
    'username': username,
    'hash': hash,
    'salt': salt
    // Will return row with ID 1
  }).save().then(function(updatedModel) {
    console.log('User created!');
    res.redirect('/');
    res.end();
  }).catch(function(err) {
    console.log('Error creating new user', err);
  });

  // if(userObj){
  //     req.session.regenerate(function(){
  //         req.session.user = userObj.username;
  //         res.redirect('/restricted');
  //     });
  // }
  // else {
  //     res.redirect('signup');
  // }
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

    // if(username == 'demo' && password == 'demo'){
    //     request.session.regenerate(function(){
    //     request.session.user = username;
    //     response.redirect('/restricted');
    //     });
    // }
    // else {
    //    res.redirect('login');
    // }    
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
