var jwt = require("jsonwebtoken");
var key = require("../key.json");
var mongoose = require("mongoose");
var _ = require('lodash');
var fs = require('fs');
var moment = require('moment');


async function getUserDetails(user, type) {
  console.log(user);
  return new Promise(async (resolve, reject) => {
    try {
      let userData = await global.modal["administrator"].aggregate([
        {
          $match: {
            _id: mongoose.Types.ObjectId(type == "core" ? user.uid : user.id),
          },
        },
        {
          $lookup: {
            from: "facilities",
            let: { facility_: "$facility" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", "$$facility_"],
                  },
                },
              },
              {
                $project: {
                  ServiceId: 1,
                  name: 1,
                  UploadCompanyLogo: 1,
                },
              },
            ],
            as: "facility",
          },
        },
        { $addFields: { facility: { $arrayElemAt: ["$facility", 0] } } },
        {
          $lookup: {
            from: "regions",
            let: { region_: "$Region" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", "$$region_"],
                  },
                },
              },
              {
                $project: {
                  name: 1,
                },
              },
            ],
            as: "Region",
          },
        },
        { $addFields: { Region: { $arrayElemAt: ["$Region", 0] } } },
        {
          $lookup: {
            from: "companies",
            let: { company_: "$Company" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", "$$company_"],
                  },
                },
              },
              {
                $project: {
                  name: 1,
                },
              },
            ],
            as: "Company",
          },
        },
        { $addFields: { Company: { $arrayElemAt: ["$Company", 0] } } },
        {
          $lookup: {
            from: "roles",
            let: { role_: "$role" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", "$$role_"],
                  },
                },
              },
            ],
            as: "role",
          },
        },
        { $addFields: { role: { $arrayElemAt: ["$role", 0] } } },
        {
          $lookup: {
            from: "aclroles",
            let: { role_: "$ACLRole" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", "$$role_"],
                  },
                },
              },
            ],
            as: "ACLRole",
          },
        },
        { $addFields: { ACLRole: { $arrayElemAt: ["$ACLRole", 0] } } },
      ]);
      return resolve(userData);
    } catch (error) {
      return resolve(error);
    }
  });
}

async function checkACLAccess(userData,moduleName){
  return new Promise(async (resolve,reject)=>{
    try {
      let accessData  = await global.modal["module"].aggregate([
        {
          $match: { Key: moduleName },
        },
        {
          $lookup: {
            from: "rolemodulerelations",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$ModuleId", "$$id"] },
                      {
                        $eq: [
                          "$RoleId",
                          mongoose.Types.ObjectId(userData[0].ACLRole._id),
                        ],
                      },
                    ],
                  },
                  TabId: { $exists: false },
                },
              },
            ],
            as: "moduleAccess",
          },
        },
        {
          $addFields: {
            moduleAccess: {
              $cond: [
                {
                  $gt: [{ $size: "$moduleAccess" }, 0],
                },
                { $arrayElemAt: ["$moduleAccess", 0] },
                { Access: false },
              ],
            },
          },
        },
        {
          $project: {
            moduleAccess: "$moduleAccess.Access",
          },
        },
      ]);
      resolve(accessData);
    } catch (error) {
      reject(error)
    }
  })
}

var requestUrlsToPassWOACL = [
  "me",
  "logticket",
  "helpguide",
  "faq",
  "role",
  "facility"
];

processData = async(decoded, token) =>{
  return new Promise((resolve,reject)=>{
    fs.readFile(moment().format('DD-MM-YYYY')+'.json',"utf8",function(err,content){
      console.log('content',moment().format('DD-MM-YYYY')+'.json',content);
      if(content){
          content = JSON.parse(content);
          if(content['revokeTokens'].indexOf(token)!=-1){
              global.modal['administrator'].update({ _id: decoded.id,a_token:token }, { $set: { a_token: '' } }).then(function(updated){
                  console.log('user updated with empty token');
                  return resolve(false)
              })
          }else{
              return resolve(true);
          }
      }else{
        return resolve(true);
      }
    })
  })
}

module.exports = {
  
  authenticateToken: async function (req, res, next) {
    // Gather the jwt access token from the request header
    let authHeader = req.headers["authorization"];
    let token = authHeader && authHeader.split(" ")[1];
    if (token == null){
      if(req.headers && req.headers.reqOrigin && req.headers.reqOrigin == 'core'){
        return res.status(401).send({
          message: "Unauthorized access.",
        });
      }else{
        return res.status(401).send(false);
      }
    }
      // return res.status(401).send({ message: "Unauthorized access" }); // if there isn't any token

    jwt.verify(token, key.accessToken, async (err, user) => {
      if (err) {
        jwt.verify(token, key.jwtKey, async (err, user) => {
          if (err){
            console.log('req.headers.host',req);
            if(req.headers && req.headers.reqOrigin && req.headers.reqOrigin == 'core'){
              return res.status(401).send({
                message: "Request token expired.",
              });
            }else{
              return res.status(401).send(false);
            }
          } else{
            try {
              let isValidToken = await processData(user,token);
              console.log(isValidToken)
              if(isValidToken){
                let userData = await getUserDetails(user);
                if(req.body && req.body.urlObj && req.body.urlObj && req.body.urlObj.url){
                  let skipAclCheck;
                  let module
                  if(req.body.urlObj.url.includes('/api/v1')){
                    module = req.body.urlObj.url.split("/",4)[3]
                  } else{
                    module = req.body.urlObj.url.split("/")[1];
                  }
                  skipAclCheck = _.indexOf(requestUrlsToPassWOACL,module, 0) 
                  if (req.body["aclModule"] && skipAclCheck<0) {
                    let moduleName = req.body["aclModule"];
                    let hasAccess = await checkACLAccess(userData,moduleName)
                    if (hasAccess && hasAccess.length && hasAccess[0].moduleAccess) {
                      req.user = userData[0];
                      next();
                    } else {
                      return res.status(403).send('noAccess');
                    }
                  } else {
                    req.user = userData[0];
                    next(); // pass the execution off to whatever request the client intended
                  }
                } else {
                  req.user = userData[0];
                  next();
                }
              } else{
                if(req.headers && req.headers.reqOrigin && req.headers.reqOrigin == 'core'){
                  return res.status(401).send({
                    message: "Request token expired.",
                  });
                }else{
                  return res.status(401).send(false);
                }
              }
            } catch (error) {
              console.log(error);
            }
          }
            
        });
      } else {
        try {
          let isValidToken = await processData(user,token);
          console.log(isValidToken)
  
          if(isValidToken){
            let userData = await getUserDetails(user, "core");
            let skipAclCheck;
            let module
            if(req && req.originalUrl){
              if(req.originalUrl.includes('/api/v1')){
                module = req.originalUrl.split("/",4)[3]
              } else{
                module = req.originalUrl.split("/")[1];
              }
              skipAclCheck = _.indexOf(requestUrlsToPassWOACL,module, 0) 
              if (req.headers["aclmodule"] && skipAclCheck<0) {
                let moduleName = req.headers["aclmodule"];
                let hasAccess = await checkACLAccess(userData,moduleName)
                if (hasAccess && hasAccess.length && hasAccess[0].moduleAccess) {
                  req.user = userData[0];
                  next();
                } else {
                  return res.status(403).send('noAccess');
                }
              } else {
                req.user = userData[0];
                next(); // pass the execution off to whatever request the client intended
              }
            }else{
              req.user = userData[0];
              next(); // pass the execution off to whatever request the client intended
            }
          }else{
            return res.status(401).send(false);
          }
        } catch (error) {
          console.log(error)
        }
      }
    });
  }

};
