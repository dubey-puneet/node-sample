var express = require('express');
var router = express.Router();
var path = require('path');

global.appRoot = path.join(__dirname, '../dist');
/* GET home page. */
router.get('/', function(req, res, next) {
  // res.send('Not allowed !!');
  res.sendFile(appRoot + '/sms-core/index.html');
});

module.exports = router;
