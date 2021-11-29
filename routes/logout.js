var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var key = require('../key.json');
var fs = require('fs');
var moment = require('moment');

router.post('/', async function (req, res, next) {
  let body = req.body;
  console.log('Grant Type =>', body.grant_type);
  if (body.grant_type == 'logout') {
    jwt.verify(body.token, key.jwtKey, function (err, decoded) {
      if (err) {
        console.log('not valid token');
        res.send(true);
      } else {
        global.modal['administrator'].update({
          _id: decoded._id
        }, {
          $set: {
            a_token: ''
          }
        });
        let currentDate = moment().format('DD-MM-YYYY');
        if (fs.existsSync(currentDate + '.json')) {
          fs.readFile(currentDate + '.json', "utf8", function (err, content) {
            if (content) {
              content = JSON.parse(content);
              content['revokeTokens'].push(body.token);
              fs.writeFile(currentDate + '.json', JSON.stringify(content), function (err) {
                if (err) throw err;
                res.send(true);
                console.log('revokeTokens added');
              });
            }
          })
        } else {
          fs.writeFile(currentDate + '.json', JSON.stringify({
            "revokeTokens": [body.token]
          }), function (err) {
            if (err) throw err;
            res.send(true);
            console.log('revokeTokens updated');
          });
        }
      }
    });
  } else {
    res.send(false);
  }
});

module.exports = router;
