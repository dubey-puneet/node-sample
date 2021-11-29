var express = require("express");
var mongoose = require("mongoose");
var router = express.Router();
var jwtVerifier = require("../middlewares/jwt-verifier");
var moduleQuery = require("../common/moduleQuery");

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.send("respond with a resource");
});

router.get(
  "/me",
  jwtVerifier.authenticateToken,
  async function (req, res, next) {
    res.send(req.user);
  }
);

router.get(
  "/userList",
  jwtVerifier.authenticateToken,
  async function (req, res, next) {
    console.log("-----------------");
    console.log(req.user);
    console.log("-----------------");
    var facility = req.user.facility._id;
    var role = req.user.ACLRole.Name;
    var subquery = {};
    if (role == "Organization Admin") {
      subquery = {
        $and: [
          {"ACLRole.Name": { "$ne":"System Admin" } },
          { "ACLRole.Name": { $exists: false } },
        ],
      };
    } else if (role == "Region Admin") {
      subquery = {
        $and: [
          {"ACLRole.Name":{ "$ne": "System Admin" } },
          {"ACLRole.Name":{ "$ne": "Organization Admin" } },
          { "ACLRole.Name": { $exists: false } },
        ],
      };
    } else if (role == "Centre Admin") {
      subquery = {
        $and: [
          {"ACLRole.Name":{ "$ne": "System Admin" } },
          {"ACLRole.Name":{ "$ne": "Organization Admin" } },
          {"ACLRole.Name":{ "$ne": "Region Admin" } },
          { "ACLRole.Name": { $exists: false } },
        ],
      };
    } else if (role == "Staff") {
      subquery = {
        $and: [
          {"ACLRole.Name":{ "$ne": "System Admin" } },
          {"ACLRole.Name":{ "$ne": "Organization Admin" } },
          {"ACLRole.Name":{ "$ne": "Region Admin" } },
          {"ACLRole.Name":{ "$ne": "Centre Admin" } },
          {"ACLRole.Name":{ "$ne": "Parent" } },
          { "ACLRole.Name": { $exists: false } },
        ],
      };
    } else if (role == "Parent") {
      subquery = {
        $and: [
          {"ACLRole.Name":{ "$ne": "System Admin" } },
          {"ACLRole.Name":{ "$ne": "Organization Admin" } },
          {"ACLRole.Name":{ "$ne": "Region Admin" } },
          {"ACLRole.Name":{ "$ne": "Centre Admin" } },
          {"ACLRole.Name":{ "$ne": "Staff" } },
          { "ACLRole.Name": { $exists: false } },
        ],
      };
    } else{
      subquery = {};
    }

    var query = [
      {
        $match: {
          facility: facility,
        },
      },
      {
        $lookup: {
          from: "aclroles",
          let: { aclrole: "$ACLRole" },
          pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$aclrole"] } } }],
          as: "ACLRole",
        },
      },
      {
        $match: subquery
      },
    ];

    console.log(JSON.stringify(query, null, 2))
    var sideBarData = await global.modal["administrator"].aggregate(query);
    return res.json({ data: sideBarData });
  }
);

router.get(
  "/userAccess",
  jwtVerifier.authenticateToken,
  async function (req, res, next) {
    console.log(" from user access")
    console.log(req.user);
    console.log(req.user.ACLRole._id);
    console.log(" from user access")

    if (req &&  req.user && req.user.ACLRole && req.user.ACLRole._id) {
      var role = req.user.ACLRole._id;
      try {
        var query = await moduleQuery.getModuleQuery(role);
        var ModuleList = await global.modal['rolemodulerelation'].aggregate(query);
        return res.json({ success: true, data: ModuleList});
      } catch (error) {

        console.log(error)
        return res.status(400).send({
          message: 'No access assigned'
        });
      }
    }else{
      return res.status(400).send({
        message: 'No access assigned'
      });
    }
  }
);

module.exports = router;
