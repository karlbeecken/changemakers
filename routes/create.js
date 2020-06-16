var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.json({ message: 'This is a POST endpoint.' });
});

router.post('/', (req, res) => {
  console.log(req.body)
})

module.exports = router;
