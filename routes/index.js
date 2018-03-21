var express = require('express');
var router = express.Router();
var Task = require('../models/task');


/* GET home page. */
router.get('/', function(req, res, next) {

  Task.find({ completed: false}).then( (docs) => {
    res.render('index', {title:'Incomplete Tasks', tasks: docs});
  }).catch( (err) => {
      next(err); //forward to error handlers
    });
});

// "POST" to create a new Task
router.post('/add', function(req, res, next){
    //Create new task
    var t = new Task({text: req.body.text, completed: false})
    //Save the task and redirect to home page if successful
    t.save().then( (newTask) => {
        console.log('The new task created is: ', newTask );
        res.redirect('/');
    }).catch( () => {
        next(err);
    });
});

//all code for module should be above the exports statement below
module.exports = router;
//nothing after this...
