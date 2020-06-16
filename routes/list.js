var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.json([{"name":"Karl Beecken","email":"karl@beecken.berlin"}]);
});

module.exports = router;
