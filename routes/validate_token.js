var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var crypto = require('crypto');
var key = require('../key.json');
var fs = require('fs');
var moment = require('moment');
const mongoose = require('mongoose');
var _ = require('lodash');
var jwtVerifier = require("../middlewares/jwt-verifier");

var cc;
if (process.env.file === 'loc') {
  cc = require('../cc_loc.json');
} else if (process.env.file === 'dev') {
  cc = require('../cc_dev.json');
} else if (process.env.file === 'uat') {
  cc = require('../cc_uat.json');
} else {
  cc = require('../cc_.json');
}

router.post('/', jwtVerifier.authenticateToken, async function (req, res, next) {
  let body = req.body;
  console.log('Refresh Token')
  console.log('Grant' ,body.grant_type);
  let urlObj = body.urlObj;
  let app = _.find(cc, {
    client_secret: body.client_secret
  });
  if (!app || app.client_id != body.client_id) {
    return res.send(false);
  }
  if (body.grant_type == 'validate') {
    jwt.verify(body.token, key.jwtKey, function (err, decoded) {
      if (err) {
        console.log('not valid token');
        res.send(false);
      } else {
        if (urlObj && urlObj.url && body.facility != null) {
          let dataToSave = new global.modal['user_access_logs']({
            app: urlObj.app ? urlObj.app : 'Sms',
            method: urlObj.type,
            url: urlObj.url,
            logat: urlObj.logat,
            facility: (body.facility && body.facility != 'null') ? mongoose.Types.ObjectId(body.facility) : '',
            user: mongoose.Types.ObjectId(decoded.id)
          });
          dataToSave.save(function (err) {
            if (!err) {
              console.log('saved the data');
            } else {
              console.trace(err);
            }
          })
        }

        fs.readFile(moment().format('DD-MM-YYYY') + '.json', "utf8", function (err, content) {
          if (content) {
            content = JSON.parse(content);
            if (content['revokeTokens'].indexOf(body.token) != -1) {
              global.modal['administrator'].update({
                _id: decoded.id,
                a_token: body.token
              }, {
                $set: {
                  a_token: ''
                }
              }).then(function (updated) {
                console.log('user updated with empty token');
                res.send(false);
              })

            } else {
              res.send(decoded.id);
            }
          } else {
            res.send(decoded.id);
          }
        })
      }
    });
  } else {
    res.send(false);
  }
});

module.exports = router;
