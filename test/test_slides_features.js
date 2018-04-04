/*

** Lab Questions **

Follow the second part of the slides to get the To do app running. Ensure all the features (flash messages for no task text, task deleted, task marked as done, all tasks done, JavaScript confirmations, error handling for invalid ObjectID values) are working.

Advanced: Add these features to the app. Use the specific variable names, route paths, flash message strings, and attributes given. You can use the Mocha tests to help verify your app is working correctly. The tests will be looking for the exact behavior specified.

Change the Task model so that tasks can save the date they were created. Save in an attribute called dateCreated. Show this date next to the task on the home page.  The data type in your model will be Date.
In the task detail page, include the date created. If the task is complete (and only if the task is complete), also include the date completed.
Change the Task model so tasks can save the date that the task was completed. Use an attribute called dateCompleted. When a task is completed, set this attribute. Show both the taskCreated and taskCompleted dates on the /completed page
In Lab 8, you added a button to the /completed page to delete all completed tasks (and only completed tasks). This button should
POST to a /deleteDone route
The route handler will delete all tasks where completed = true
Create an info flash message saying "All Completed Tasks Deleted" with code like this:
req.flash('info', 'info message goes here');
Redirect to the home page. The info flash message should be shown.
If there is an error deleting, the route handler should pass the request to the error handler.
You can save JavaScript date objects in MongoDB. To create a date that represents right now,

var d = new Date();   // d is a Date object representing the time and date the object was created.

Modify the Task detail page. Add a Delete button. When this button is clicked, create a POST request to the same delete route you created earlier to delete this task, and re-direct to the home page of incomplete tasks
Modify the Task detail page. IF this task is not complete, add a Done! button to mark this task as complete. When this button is clicked, create a POST request to the /done route created earlier, to mark this task as complete and redirect to the home page of incomplete tasks.

* */

// Database setup.

// Create a separate test database at mLab.

// Overwrite the database URL with the test database.

let db_config = require('../config/db_config');
let test_db_url = process.env.TEST_MONGO_URL;  // Verify that this environment variable is configured on your computer
db_config.db_url = test_db_url;

const TEST_DB_NAME = 'test_todo';   // TODO change this if your database name is different
const TEST_DB_COLLECTION = 'tasks';

let mongodb_client = require('mongodb').MongoClient;
let Task = require('../models/task');

// Chai config
let chai = require('chai');
let chaiHTTP = require('chai-http');
let server = require('../app');
let expect = chai.expect;

let chaiHtml = require('chai-html');

chai.use(chaiHTTP);
chai.use(chaiHtml);

// Cookie server remembers cookies, needed to test flash messages. chai_server does not.
let cookie_server = chai.request.agent(server);
let chai_server =  chai.request(server);

describe('remove all data from db before tests, close DB connection after tests', () => {

    let tasks;
    let task_db_client;

    beforeEach('delete all docs from task collection', (done) => {
        mongodb_client.connect(test_db_url)
            .then((client) => {
                task_db_client = client;
                tasks = task_db_client.db(TEST_DB_NAME).collection(TEST_DB_COLLECTION);
                tasks.deleteMany({}).then(()=>{
                    done();
                });
            })

    });


    afterEach('close database connection', (done) => {
        task_db_client.close(true)
            .then(() => {
                done();
            })
    });


    describe('tests with empty database', () => {

        it('should be able to create a new completed task document with a dateCompleted and dateCreated attribute', (done)=>{
            let dCreate = new Date();
            let dCompleted = new Date();
            let t = new Task({text:"testing", dateCompleted: dCreate, dateCreated: dCompleted, completed:true});
            // fields not defined in the model will not be saved
            t.save().then((savedTask)=>{
                expect(savedTask).to.have.property('dateCompleted').that.is.a('Date').equal(dCreate);
                expect(savedTask).to.have.property('dateCreated').that.is.a('Date').equal(dCompleted);
                expect(savedTask).to.have.property('text').that.is.a('String').equal("testing");
                expect(savedTask).to.have.property('completed').that.is.a('Boolean').to.be.true;
                done();
            })
        });


        it('should be able to create a new incomplete task document with a dateCreated attribute', (done)=>{
            let dCreate = new Date();
            let t = new Task({text:"testing", dateCompleted: dCreate, completed:false});
            // fields not defined in the model will not be saved
            t.save().then((savedTask)=>{
                expect(savedTask).to.have.property('dateCompleted').that.is.a('Date').equal(dCreate);
                expect(savedTask).to.have.property('dateCreated').to.be.undefined;
                expect(savedTask).to.have.property('text').that.is.a('String').equal("testing");
                expect(savedTask).to.have.property('completed').that.is.a('Boolean').to.be.false;
                done();
            })
        });


        it('should create a new task with dateCreated = current date and dateCompleted = undefined when posting to /add', (done)=>{
            chai_server
                .post('/add')
                .send( {text: 'water plants'})
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    Task.find({}).then((tasks) => {
                        expect(tasks).to.have.lengthOf(1);
                        expect(tasks[0]).to.have.property('text').equal('water plants');
                        expect(tasks[0]).to.have.property('completed').to.be.false;
                        let now_ts = new Date().getTime();  //ms
                        let created_ts = tasks[0].dateCreated.getTime();
                        expect(created_ts - now_ts).to.be.closeTo(0, 1000 * 10);  // expected, delta. Within 10 seconds.
                        expect(tasks[0]).to.have.property('dateCompleted').to.be.undefined;
                        done();
                    });
                });
        });


    });   // end of describe tests with no data in DB


    describe('tests with test data', ()=>{

        let monday = new Date(1487016000); // 02/13/2017 @ 8:00pm (UTC)
        let tuesday = new Date(1509469200);  // 10/31/2017 @ 5:00pm (UTC)
        let wednesday = new Date(1518642000); // 02/14/2018 @ 9:00pm (UTC)

        let eat_pizza = { text : "eat pizza", completed : true, dateCreated: monday, dateCompleted: wednesday};
        let oil_change = { text : "oil change", completed : false, dateCreated: tuesday};
        let assignment = { text : "assignment", completed : false, dateCreated: wednesday};

        beforeEach('add test data', (done)=>{
            tasks.insertMany([
                eat_pizza, oil_change, assignment
            ]).then((result)=>{
                eat_pizza = result.ops[0];
                oil_change = result.ops[1];
                assignment = result.ops[2];
                done();
            })
        });

        it('should show a list of incomplete tasks on the home page, including date created', (done)=>{
            chai_server
                .get('/')
                .end((err, res)=>{
                    expect(res.status).to.equal(200);
                    expect(res.text).not.to.include('eat pizza');

                    expect(res.text).to.include('oil change');
                    expect(res.text).to.include('assignment');

                    expect(res.text).to.include(oil_change.dateCreated.toString());
                    expect(res.text).to.include(assignment.dateCreated.toString());

                    done();

                    // note that the other tests check for links to task details page.
                })
        });


        it('should show a list of completed tasks on the /completed page including dateCompleted and dateCreated attribute', (done)=>{
            chai_server
                .get('/completed')
                .end((err, res) =>{

                    expect(res.text).to.include('eat pizza');

                    expect(res.text).not.to.include('oil change');
                    expect(res.text).not.to.include('assignment');

                    expect(res.text).to.include(eat_pizza.dateCreated.toString());
                    expect(res.text).to.include(eat_pizza.dateCompleted.toString());
                    done();
                });
        });


        it('should delete all completed tasks when posting to /deleteDone', (done)=>{

            //The route handler will delete all tasks where completed = true
            //Create an info flash message saying "All Completed Tasks Deleted" with code like this:
            cookie_server
                .post('/deleteDone')
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.text).to.contain('All completed tasks deleted');
                    Task.find({completed:true}).then((tasks)=>{
                        expect(tasks).to.have.lengthOf(0);
                        done();
                    })
                })
        });


        it('should show a delete all button on the /completed page that posts to /deleteDone', (done)=>{

            chai_server
                .get('/completed')
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.text).to.match(/action\s*=\s*['"]\/deleteDone['"]/); // TODO Check for actual button that does the right action
                    done();
                })
        });


        it('should modify a task to have the completedDate = now and completed = true on post to /done', (done)=>{
            cookie_server
                .post('/done')
                .send({ _id : assignment._id})
                .end((err, res) => {
                    // redirect to home page with flash message
                    expect(res.status).to.equal(200);
                    expect(res.text).to.contain('assignment marked as done');
                    Task.findById( assignment._id ).then( (db_task) =>{
                        expect(db_task.dateCreated.getTime()).to.equal(assignment.dateCreated.getTime());
                        expect(db_task).to.have.property('text').equal(assignment.text);
                        expect(db_task).to.have.property('completed').to.be.true;
                        let db_date_completed_ts = db_task.dateCompleted.getTime();
                        let now_ts = new Date().getTime();
                        expect(db_date_completed_ts - now_ts).to.be.closeTo(0, 10 * 1000); //within 10 seconds
                        done();
                    })
                });

        });

        it('should show a delete button on the task detail page that posts to /delete', (done)=>{

            chai_server
                .get('/task/' + eat_pizza._id)
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.text).to.contain('Delete');   /// todo check for it actually being a button
                    done();
                })
        });


        it('should show a done button on the task detail page that posts to /done if this task is NOT complete', (done)=>{

            chai_server
                .get('/task/' + oil_change._id)
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.text).to.contain('Done!');   /// todo check for it actually being a button
                    done()
                });
        });


        it('should NOT show a done button on the task detail page that posts to /done if this task is complete', (done)=>{

            chai_server
                .get('/task/' + eat_pizza._id)
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.text).not.to.contain('Done!');   /// todo check for it actually being a button
                    done();
                });
        });


    });


}).timeout(10000);