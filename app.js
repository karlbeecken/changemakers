var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser= require('body-parser');
var cors = require('cors');
var MongoClient = require('mongodb').MongoClient;

var createRouter = require('./routes/create');
var listRouter = require('./routes/list');

var app = express();

var connectionString = "";

MongoClient.connect(connectionString, (err, client) => {
    if (err) return console.error(err);
    console.log('Connected to Database');
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.use('/create', createRouter);
app.use('/list', listRouter);

module.exports = app;
