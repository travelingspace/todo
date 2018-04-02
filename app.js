var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var bodyParser =  require('body-parser');
var flash = require('express-flash');
var session = require('express-session');


//read environment variable
var db_url = process.env.mongo_url;

//connect to db and print success message
mongoose.connect(db_url).then(() => {console.log("Connected to mLab.");}).catch( (err) => {console.log("Error connecting: " + err.message);})

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({secret:'top secret', resave: false, saveUninitialized: false}));
app.use(flash());

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development

    //catches objectId errors
    if(err.kind === 'ObjectId' && err.name === 'CastError'){
        err.status = 404;
        err.message = 'ObjectId Not Found';
    }

  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.log(err.kind)
  console.log(err.name)

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
