var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser= require('body-parser');
var cors = require('cors');
var MongoClient = require('mongodb').MongoClient;
var nodemailer = require('nodemailer');
var crypto = require('crypto');
var mongoose = require('mongoose');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const url = 'mongodb://localhost/changemakers';


mongoose.connect(url, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

const dbase = mongoose.connection;
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  isVerified: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

dbase.on('error', console.error.bind(console, 'connection error: '));
dbase.once('open', () => {
  app.get('/list', function(req, res, next) {
    dbase.collection("user").find().toArray((err, results) => {
        res.json(results)
      });
    });

    app.get('/list/html', function(req, res, next) {
      let html = "";
      dbase.collection("entries").find().toArray( (err, results) => {
          html += "<html><head><link rel='stylesheet' href='/stylesheets/style.css'></head><ul>";
          results.forEach( entry => {
            html += "<li>" + entry.name + "</li>";
          });
          html += "</ul></html>";
          res.send(html);
        });
      });

    app.get('/add', function(req, res, next) {
        res.json({ message: 'This is a POST endpoint.' });
    });

    app.post('/add', (req, res) => {
      console.log(req.body.name + " :: " + req.body.email)
      const user = new User({
        name: req.body.name,
        email: req.body.email
      });
      user.save((err, result) => {
        if(err) {
          console.log(err);
          res.status(500);
          res.end();
        }
      res.json({ entry });
      })
    });

    app.post('/add/html', (req, res) => {
      console.log(req.body.name + " :: " + req.body.email)
      const user = new User({
        name: req.body.name,
        email: req.body.email
      });

      user.save((err, result) => {
        if(err) {
          console.log(err);
          res.status(500);
          res.end;
        }
        let html = "<html><head><link rel='stylesheet' href='/stylesheets/style.css'></head><body>";
        html += "<h2>Der Name <span style='font-family: monospace;'>"
        html += result.name;
        html += "</span> wurde erfolgreich eingetragen.</h2>"
        html += "<a href='/'>zurück zum Start</a>"
        html += "</body></html>";
        res.send(html);
      });
  });

    app.listen(3123, () => {
        console.log('app working on 3123')
      })
})
