var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var key = require('../key.json');
var fs = require('fs');
var moment = require('moment');
const mongoose = require('mongoose');
var _ = require('lodash');
var helper = require('../helper/helper')

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

router.post('/', async function (req, res, next) {
  console.log('Refresh Token')
  let body = req.body;
  console.log('Grant' ,body.grant_type);
  let urlObj = body.urlObj;
  if (!req.headers.reqorigin || !req.headers.reqorigin.includes('core')) {
    let app = _.find(cc, {
      client_secret: body.client_secret
    });
    if (!app || app.client_id != body.client_id) {
      return res.status(401).send(false);;
    }
  }
  if (body.grant_type == 'refresh') {
    function afterVeriFy(decoded) {
      if (urlObj && urlObj.url) {
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

      fs.readFile(moment().format('DD-MM-YYYY') + '.json', "utf8", async function (err, content) {
        if (content) {
          content = JSON.parse(content);
          if (content['revokeTokens'].indexOf(body.token) != -1) {
            res.status(401).send(false);
          } else {
            refreshedToken(decoded.id ? decoded.id : decoded.uid, body.token, res, req)
          }
        } else {
          refreshedToken(decoded.id ? decoded.id : decoded.uid, body.token, res, req);
        }
      })

    }

    jwt.verify(body.token, key.accessToken, function (err, decoded) {
      if (err) {
        jwt.verify(body.token, key.jwtKey, function (err, decoded) {
          if (err) {
            console.error('Invalid token');
            res.status(401).send(false);
          } else {
            afterVeriFy(decoded);
          }
        })
      } else {
        afterVeriFy(decoded);
      }
    });

  } else {
    res.status(401).send(false);
  }
});


async function refreshedToken(id, token, res, req) {
  let anyUser = await global.modal['administrator'].findOne({
    _id: id
  });

  if (anyUser && anyUser._id) {
    let _adForSite = '';
    console.info('DB Token', anyUser.a_token);
    if (anyUser.a_token) {
      jwt.verify(anyUser.a_token, key.jwtKey, function (err, decoded) {
        if (err) {
          console.info('verify error', err);
          _adForSite = helper.createNewToken(anyUser, req);
        } else {
          console.info('Decoded token', decoded);
          let timeDiffrence = moment.unix(decoded.exp).diff(moment(),'minutes');
          console.log(timeDiffrence);
          if(timeDiffrence > 0){
            console.info('token not expired');
            _adForSite = anyUser.a_token            
          } else {
            console.info('token expired... creating new token');
            _adForSite = helper.createNewToken(anyUser, req);
          }

          if (req.headers && req.headers.reqorigin && req.headers.reqorigin.includes('core')) {
            res.json({
              token: _adForSite
            });
          } else {
            res.send(_adForSite);
          }
        }
      });
    }
  } else {
    if (req.headers.reqorigin && req.headers.reqorigin.includes('core')) {
      res.json({
        token: token
      });
    } else {
      res.send(token);
    }
  }
}

module.exports = router;

