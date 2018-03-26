var express = require('express');
var router = express.Router();
var Task = require('../models/task');


/* GET home page. */
router.get('/', function(req, res, next) {

  Task.find({ completed: false})
      .then( (docs) => {
    res.render('index', {title:'Incomplete Tasks', tasks: docs});
    }).catch( (err) => {
      next(err); //forward to error handlers
    });
});

// GET Done page of completed tasks
router.get('/done', function(req, res, next){
    Task.find({ completed: true})
        .then( (docs) => {
            res.render('completed-tasks', {title:'Completed Tasks', tasks: docs});
        }).catch( (err) => {
            next(err);
        })
})

// "POST" to create a new Task
router.post('/add', function(req, res, next){
    //check to see if text is valid
    if (req.body.text) {
        //Create new task
        var t = new Task({text: req.body.text, completed: false})
        //Save the task and redirect to home page if successful
        t.save().then((newTask) => {
            console.log('The new task created is: ', newTask);
            res.redirect('/');
        }).catch(() => {
            next(err);
        });
    }
    else{
        //error handling if text is left blank on submit of task
        res.redirect('/');
    }
});

// "POST" to done page
router.post('/done', function(req, res, next){
    Task.findByIdAndUpdate(req.body._id, {completed: true})
        .then( (originalTask) => {
            if(originalTask){
                res.redirect('/');
            }else{
                var err = new Error('Not found');
                err.status = 404;
                next(err);
            }
        } )
})

// "POST" to delete a task
router.post('/delete', function(req, res, next){
    Task.findByIdAndRemove(req.body._id)
        .then( (deletedTask) =>{
            if(deletedTask){
                res.redirect('/');
            }else{
                var err = new Error('Task not found')
                error.status = 404
                next(err);
            }
        }).catch( (err) => {
            next(err);
    })
})

// "POST" to close all tasks as done
router.post('/alldone', function(req, res, next){
    Task.updateMany({completed:false},{completed:true})
        .then( () => {
            res.redirect('/');
        })
        .catch( (err) => {
            next(err);
        })
})

// "GET" details about a specific task
router.get('/task/:_id', function(req, res, next){
    Task.findById(req.params._id)
        .then( (doc) => {
            if (doc){
                res.render('task', {task: doc});
            }
            else{
                next();
            }
        })
        .catch( (err) => {
            next(err);
        })
})


//all code for module should be above the exports statement below
module.exports = router;
//nothing after this...
