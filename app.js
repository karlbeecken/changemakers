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
var reCAPTCHA = require('recaptcha2');
var ejs = require('ejs');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.set('views', './views');
app.set('view engine', 'ejs');

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
var recaptcha = new reCAPTCHA({
  siteKey: process.env.CAPTCHA_SITEKEY,
  secretKey: process.env.CAPTCHA_SECRET
});

transport.verify((error, success) => {
  if(error) {
    console.error(error);
    console.error('Exiting');
    process.exit(1);
  } else {
    console.log(success);
    console.log('Server is ready to take our messages');
  }
});
 
const url = 'mongodb://localhost/changemakers';
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
  app.get('/', (req, res, next) => {
    res.render('index', {
      captchaSitekey: process.env.CAPTCHA_SITEKEY,
    });
  });
  app.get('/list', function(req, res, next) {
    dbase.collection("user").find().toArray((err, results) => {
      res.json(results)
    });
  });

  app.get('/list/html', async function(req, res, next) {
    const users = await User.find({ isVerified: true });
    res.render('list', { users });
  });

  app.get('/add', function(req, res, next) {
      res.json({ message: 'This is a POST endpoint.' });
  });

  app.post('/add', (req, res) => {
    console.log(req.body.name + " :: " + req.body.email)
    let key = req.body['g-recaptcha-response'];
    recaptcha.validate(key)
      .then(function() {
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
        });
        res.json({ entry });
      })
      .catch(function(errorCodes) {
        console.error(recaptcha.translateErrors(errorCodes));
      });
  });

  app.post('/add/html', async (req, res) => {
    console.log(req.body.name + " :: " + req.body.email);
    let key = req.body['g-recaptcha-response'];
    recaptcha.validate(key)
      .then(function() {
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
          res.render('verificationNeeded');

          const token = new Token({
            _userId: result._id,
            token: crypto.randomBytes(16).toString('hex')
          });
          token.save(async (error) => {
            if (error) {
              console.error(error);
              return res.status(500).send({msg: 'Something went wrong'});
            }
            const verifyUrl = `${process.env.PAGE_URL}/verify?token=${token.token}`;
            transport
              .sendMail({
                text: verifyUrl,
                html: await ejs.renderFile('views/verificationMail.ejs', { verifyUrl }),
                to: user.email
              })
              .then(() => console.log('Sent Verification Mail'));
          })
        })
      })
      .catch(function(errorCodes) {
        console.log(recaptcha.translateErrors(errorCodes));
      });
    });

  app.get('/verify', async (request, response) => {
    const token = await Token.findOneAndDelete({
      token: request.query.token
    });
    if(token === null) {
      response.status(404);
      response.render('invalidToken');
      return;
    }
    console.log(token);
    const user = await User.findOneAndUpdate(
      { _id: token._userId },
      {
        isVerified: true,
      });
    console.log(user);
    let redirectUrl = process.env.REDIRECT_URL || '/';
    response.redirect(redirectUrl);
  });

  app.listen(3123, () => {
      console.log('app working on 3123')
  });
})
