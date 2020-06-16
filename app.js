var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser= require('body-parser');
var cors = require('cors');
var MongoClient = require('mongodb').MongoClient;

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const url = 'mongodb://localhost';

MongoClient.connect(url, (err, db) => {
  var dbase = db.db("changemakers");
  if (err) return console.log(err)

  app.get('/list', function(req, res, next) {
    dbase.collection('entries').find().toArray( (err, results) => {
        res.json(results)
      });
    });

    app.get('/add', function(req, res, next) {
        res.json({ message: 'This is a POST endpoint.' });
    });
  
    app.post('/add', (req, res) => {
        console.log(req.body)
    })

    app.listen(3123, () => {
        console.log('app working on 3123')
      })
})