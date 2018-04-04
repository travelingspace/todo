// Utility modules
let _ = require('lodash');


// Database setup.

// Create a separate test database at mLab.

// Overwrite the database URL with the test database.

let db_config = require('../config/db_config');
let test_db_url = process.env.TEST_MONGO_URL;  // Verify that this environment variable is configured on your computer
db_config.db_url = test_db_url;

const TEST_DB_NAME = 'test_todo';   // TODO change this if your database name is different
const TEST_DB_COLLECTION = 'tasks';

let mongodb_client = require('mongodb').MongoClient;
let ObjectID = require('mongodb').ObjectID;


// Chai config

let chai = require('chai');
let chaiHTTP = require('chai-http');
let server = require('../app');
let expect = chai.expect;

chai.use(chaiHTTP);

let agent = chai.request.agent(server);

// Tests!

describe('empty test db before tests, and and close db after ', () => {

    let tasks;
    let task_db_client;

    beforeEach('get task collection and delete all docs',  (done) => {

        mongodb_client.connect(test_db_url)
            .then((client) => {

                task_db_client = client;
                tasks = task_db_client.db(TEST_DB_NAME).collection(TEST_DB_COLLECTION);

                tasks.deleteMany({}).then(() => {
                        done();
                    }
                )

            })

    });

    afterEach('close DB connection', (done) => {
        task_db_client.close(true)
            .then(() => {  done() })
    });


    after('close the agent server', (done) =>{
        agent.app.close();
        done();
    });

    describe("task tests with empty database", () => {

        it('No task message on home page when db is empty', (done) => {
            chai.request(server)
                .get('/')
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.text).to.include("No tasks to do!");
                    done();
                });
        });


        it('No tasks completed message when db is empty', (done) => {
            chai.request(server)
                .get('/completed')
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.text).to.include("No tasks have been completed");
                    done();
                });
        });


        it('should return 404 on GET to task/ if id is not provided', (done) => {
            chai.request(server)
                .get('/task/')
                .end((err, res) => {
                    expect(res.status).to.equal(404);
                    done();
                })
        });


        it('should return 404 on GET to task/_id if id is not a valid Object ID', (done) => {
            chai.request(server)
                .get('/task/1234567')
                .end((err, res) => {
                    expect(res.status).to.equal(404);
                    done();
                })
        });


        it('should return 404 on GET to task/_id if the Object ID is not found', (done) => {
            chai.request(server)
                .get('/task/1234567890abcdef1234567890')  // A valid _id but not in the database.
                .end((err, res) => {
                    expect(res.status).to.equal(404);
                    done();
                });
        });


        it('should add a new task to the database on POST to /add', (done) => {
            chai.request(server)
                .post('/add')
                .send( { text: 'water plants' } )
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.text).to.include('water plants');

                    tasks.find().toArray().then( (docs) => {
                        expect(docs.length).to.equal(1);
                        let doc = docs[0];
                        expect(doc).to.have.property('text').equal('water plants');
                        expect(doc).to.have.property('completed').equal(false);
                        done();
                    });
                });
        });


        it('should NOT add a new task to the database on POST to /add with no body, and display a flash error ', (done) => {

            // var agent = chai.request(server);

            agent
                .post('/add')
                .redirects(1)
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.text).to.include('Please enter a task');
                    expect(res.text).to.include('No tasks to do!');

                    tasks.find().count().then( (count) => {
                        expect(count).to.equal(0);
                        done();
                    });
                });
        });


    });  // End of describe('task tests with empty db')



    describe('task tests start with 3 example tasks', () =>{

        let walk_dog;
        let oil_change;
        let assignment;

        beforeEach('add three example task documents',  (done) => {

            tasks.insertMany([
                { text : "walk dog", completed : false},
                { text : "oil change", completed : false},
                { text : "assignment", completed : true}
            ])
                .then((result)=>{

                    walk_dog = result.ops[0];
                    oil_change = result.ops[1];
                    assignment = result.ops[2];

                    done();

                })
        });


        it('should show a list of tasks on the home page, from tasks in db', (done) => {
            chai.request(server)
                .get('/')
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.text).to.include('walk dog');
                    expect(res.text).to.include('oil change');
                    expect(res.text).not.to.include('assignment');
                    done();
                });
        });


        it('should show a list of completed tasks on /completed page, from the db', (done) => {
            chai.request(server)
                .get('/completed')
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.text).not.to.include('walk dog');
                    expect(res.text).not.to.include('oil change');
                    expect(res.text).to.include('assignment');
                    done();
                });
        });


        it('should show a not-complete task\'s details on GET to /task/ID', (done) => {
            chai.request(server)
                .get('/task/' + walk_dog._id)
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.text).to.include('walk dog');
                    expect(res.text).to.include('is not yet completed');
                    done();
                });
        });


        it('should show a completed task\'s details on GET to /task/ID', (done) => {
            chai.request(server)
                .get('/task/' + assignment._id)
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.text).to.include('assignment');
                    expect(res.text).to.match(/\b(was|is)\b complete/);
                    done();
                });
        });


        it('should have links to the task detail page in the list of incomplete tasks', (done)=>{
            chai.request(server)
                .get('/')
                .end((err, res)=>{
                    expect(res.status).to.equal(200);
                    let regex = new RegExp(`<a href=['"]task/` + walk_dog._id + `['"]>`);
                    expect(res.text).to.match(regex);
                    regex = new RegExp(`<a href=['"]task/` + oil_change._id + `['"]>`);
                    expect(res.text).to.match(regex);
                    done();
                });
        });



        it('should have links to the task detail page in the list of complete tasks', (done)=>{
            chai.request(server)
                .get('/completed')
                .end((err, res)=>{
                    expect(res.status).to.equal(200);
                    let regex = new RegExp(`<a href=['"]task/` + assignment._id + `['"]>`);
                    expect(res.text).to.match(regex);
                    done();
                });
        });



        it('should mark a task as done on POST to /done body._id', (done) => {
            //chai.request(server)
            agent
                .post('/done')
                .send({'_id': walk_dog._id})
                .redirects(1)
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    // should be redirected home
                    expect(res.text).to.include('walk dog marked as done!');   //flash message
                    let page = res.text.replace('walk dog marked as done!');
                    expect(page).to.not.include('walk dog');  // but no other 'walk dog' text

                    // check the DB
                    tasks.findOne({_id: ObjectID(walk_dog._id)}).then((doc) => {
                        expect(doc.completed).to.be.true;

                        // and then fetch the /completed page...
                        chai.request(server)
                            .get('/completed')
                            .send({'_id': walk_dog._id})
                            .end((err, res) => {
                                expect(res.text).to.include('walk dog');   // contains 'walk dog'
                                done();
                            });
                    });
                })
        });


        it('should return 404 on POST to /done if _id is missing', (done) => {
            chai.request(server)
                .post('/done')
                .end((err, res) => {
                    expect(res.status).to.equal(404);
                    // TODO check the DB is not modified
                    done();
                })
        });


        it('should return 404 on POST to /done if _id is not a valid _id', (done) => {
            chai.request(server)
                .post('/done')
                .send({'_id': '345345354'})
                .end((err, res) => {
                    expect(res.status).to.equal(404);
                    // TODO check the DB is not modified
                    done();
                })

        });


        it('should return 404 on POST to /done if _id is a valid _id not in database', (done) => {
            chai.request(server)
                .post('/done')
                .send({'_id' : '1234567890abcdef1234567890'})
                .end((err, res) => {
                    expect(res.status).to.equal(404);
                    // TODO check the DB is not modified
                    done();
                });
        });


        it('should delete a task document with POST to delete with body._id', (done) => {
            // chai.request(server)
            agent
                .post('/delete')
                .send({ '_id' : oil_change._id})
                .redirects(1)
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.req.path).to.equal('/');
                    expect(res.text).not.to.contain('oil change');
                    expect(res.text).to.contain('Task deleted');  // flash message
                    tasks.findOne({_id : ObjectID(oil_change._id) } ).then((doc) => {
                        expect(doc).to.be.null;
                    }).then( () => {
                        tasks.find().count().then( (count) => {
                            expect(count).to.equal(2);
                            done();
                        })
                    })
                })
        });


        it('should return 404 on POST to /delete a task document with invalid _id', (done) => {
            chai.request(server)
                .post('/delete')
                .send({ '_id' : 'qwerty'})   //invalid
                .end((err, res) => {
                    expect(res.status).to.equal(404);
                    tasks.find().count().then( (count) => {
                        expect(count).to.equal(3);
                        done();
                    })
                });
        });


        it('should return 404 on POST to /delete a task document with valid _id but not present in DB', (done) => {
            chai.request(server)
                .post('/delete')
                .send({ '_id' : '123456123456123456123456'})   //valid but doesn't exist
                .end((err, res) => {
                    expect(res.status).to.equal(404);
                    tasks.find().count().then( (count) => {
                        expect(count).to.equal(3);
                        done();
                    })
                });
        });


        it('should return 404 on POST to /delete a task document with no _id', (done) => {
            chai.request(server)
                .post('/delete')
                .end((err, res) => {
                    expect(res.status).to.equal(404);
                    tasks.find().count().then( (count) => {
                        expect(count).to.equal(3);
                        done();
                    })
                });
        });


        it('should mark all tasks as done on POST to /allDone', (done) => {

            //  var agent = chai.request.agent(server);

//      chai.request(server)
            agent
                .post('/allDone')
                .redirects(1)
                .end((err, res) => {
                    expect(res.status).to.equal(200);
                    expect(res.text).to.include('No tasks to do!');
                    expect(res.text).to.include('All tasks are done!'); // flash message
                    tasks.find( { completed : true }).count().then( (count) => {
                        expect(count).to.equal(3);
                        done();

                    })
                });
        });

    });


}).timeout(10000);   // end of outer describe