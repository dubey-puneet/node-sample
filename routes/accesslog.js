var express = require('express');
var router = express.Router();
var mailer = require('../components/tools/email');
var jwt = require('jsonwebtoken');
var key = require('../key.json');
var crypto = require('crypto');
var jwtVerifier = require('../middlewares/jwt-verifier')
const mongoose = require('mongoose');
var moment = require('moment');

function md5(str, encoding) {
  str = str.toString();
  return crypto.createHash('md5').update(str, 'utf8').digest(encoding || 'hex');
}

router.post('/', jwtVerifier.authenticateToken, async function(req, res, next) {
    let query = [];
    if(req.body.facility){
      query.push({
        $match:{facility: mongoose.Types.ObjectId(req.body.facility)}
      })
    }
    if(req.body.user){
      query.push({
        $match:{user: mongoose.Types.ObjectId(req.body.user)}
      })
    }
    if(req.body.startDate){
      query.push({
        $match:{logat:  { $gte:  moment(req.body.startDate).startOf('day').toDate() } }
      })
    }
    if(req.body.endDate){
      query.push({
        $match:{logat:  { $lte:  moment(req.body.endDate).endOf('day').toDate() } }
      })
    }
    query.push(
      {
        $lookup: {
            from: 'facilities',
            let:  { facility: "$facility" },
            pipeline: [
              { 
                  $match: { $expr: { $eq: [ "$_id",  "$$facility" ] }}
              },
              { 
                  $project : {
                    name:1
                  }
              }

          ],
          as: 'facility'
        }
      },
      {
          $lookup: {
              from: 'administrators',
              let:  { user: "$user" },
              pipeline: [
                { 
                    $match: { $expr: { $eq: [ "$_id",  "$$user" ] }}
                },
                { 
                    $project : {
                      name: { $concat: [ "$firstname"," ","$lastname"] }
                    }
                }

            ],
            as: 'user'
          }
      },
      {
          $addFields:{
              facility: { $arrayElemAt: ["$facility", 0] },
              user: { $arrayElemAt: ["$user", 0] }
          }
      },
      {
        "$facet": {
            "result": [
              { 
                $sort : { 
                  [req.body.sort] :  req.body.sortOrder
                } 
              },
              {
                $skip: req.body.skip
              },
              {
                $limit: req.body.limit? req.body.limit :20
              }
            ],
            "totalCount": [{
              "$count": "count"
            }]
        }
      })
    console.log(JSON.stringify(query, null, 2))
    try {
      var userLogs = await global.modal['user_access_logs'].aggregate(query)
      res.send(userLogs);
    } catch (error) {
      res.send(error);
    }
});



module.exports = router;