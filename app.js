require('dotenv').config()
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser= require('body-parser');
var cors = require('cors');
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

const transport = nodemailer.createTransport({
  host: "klimaschutz.lol",
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  }
}, {
  from: 'noreply@change-makers.de',
  to: 'berlincent@klimaschutz.lol',
  subject: 'E-Mail bestätigen',
});


transport.verify((error, success) => {
  if(error) {
    console.error(error);
  } else {
    console.log(success);
    console.log('Server is ready to take our messages');
  }
});
 
mongoose.connect(url, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useFindAndModify: false
});

const dbase = mongoose.connection;
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  isVerified: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);
const tokenSchema = new mongoose.Schema({
  _userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'},
  token: {
    type: String,
    required: true}
});
const Token = mongoose.model('Token', tokenSchema);

dbase.on('error', console.error.bind(console, 'connection error: '));
dbase.once('open', () => {
  app.get('/list', function(req, res, next) {
    dbase.collection("user").find().toArray((err, results) => {
        res.json(results)
      });
    });

    app.get('/list/html', function(req, res, next) {
      let html = "";
      dbase.collection("users")
        .find({ isVerified: true })
        .toArray( (err, results) => {
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
        const token = new Token({
          _userId: result._id,
          token: crypto.randomBytes(16).toString('hex')
        });
        token.save((error) => {
          if (error) {
            console.error(error);
            return res.status(500).send({msg: 'Something went wrong'});
          }
          const verifyURL = 
            `http://localhost:3123/verify?token=${token.token}`;
          transport
            .sendMail({
              text: verifyURL,
              html: `<a href="${verifyURL}">Hier verifizieren</a>`,
              to: user.email
            })
            .then(() => console.log('Sent Verification Mail'));
        });
      });
    });

    app.get('/verify', async (request, response) => {
      const token = await Token.findOneAndDelete({
        token: request.query.token
      });
      if(token === null) {
        response.status(404);
        // Add proper HTML
        response.send("Invalid Token");
        return;
      }
      console.log(token);
      const user = await User.findOneAndUpdate(
        { _id: token._userId },
        {
          isVerified: true,
        });
      console.log(user);
      response.redirect('/');
    });

    app.listen(3123, () => {
        console.log('app working on 3123')
      })
})
