var express = require("express");
var mongoose = require("mongoose");
var router = express.Router();
var jwtVerifier = require("../middlewares/jwt-verifier");
var _ = require("lodash");

router.post(
  "/create",
  jwtVerifier.authenticateToken,
  async function (req, res, next) {
    var body = req.body;
    console.log(body);

    var role = {
      Name: body.Name,
      Description: body.Description,
      CreatedBy: mongoose.Types.ObjectId(req.user._id),
      roleCreatedFrom: mongoose.Types.ObjectId(body.copyFrom),
      Organisation: mongoose.Types.ObjectId(body.Organisation),
      Regions: body.Regions,
      Facilities: body.Facilities,
    };
    let anyOldRecord = await global.modal["aclrole"].findOne({Name:role.Name,Description:body.Description});
    if(anyOldRecord && anyOldRecord._id){
      return res.json(404, { success: false, message:'System found record with same Name and Description, so Please select different role name or description'});
    }
    var alreadyExist = false;
    console.log("--------alreadyExist----------");
    console.log(alreadyExist);
    console.log("--------alreadyExist----------");
    if (alreadyExist && alreadyExist.length) {
      return res.json(404, {
        success: false,
        message: "Access role with same name already exist",
      });
    } else {
      var newrole = global.modal["aclrole"](role);
      newrole.save(async function (err, roleData) {
        if (err) {
          console.log(err);
          return res.json(404, { success: false, error: error });
        } else {
          if (body.copyFrom) {
            var roleModuleRelation = await global.modal[
              "rolemodulerelation"
            ].find(
              {
                RoleId: mongoose.Types.ObjectId(body.copyFrom)
              },
              { _id: 0 }
            );
            if (roleModuleRelation && roleModuleRelation.length) {
              Promise.all(
                roleModuleRelation.map(async (roleMod) => {
                  if (body.createNew) {
                    roleMod.Access = false;
                  }
                  roleMod.RoleId = mongoose.Types.ObjectId(roleData._id);
                })
              ).then(async () => {
                console.log(roleModuleRelation);
                global.modal["rolemodulerelation"].insertMany(
                  roleModuleRelation,
                  function (error, docs) {
                    if (error) {
                      return res.json(404, { success: false, error: error });
                    } else {
                      res.json({ success: true, data: roleData });
                    }
                  }
                );
              });
            }
          } else {
            res.json({ success: true, data: roleData });
          }
        }
      });
    }
  }
);

router.put(
  "/update",
  jwtVerifier.authenticateToken,
  async function (req, res, next) {
    console.log(req.user);
    var body = req.body;
    if (body._id) {
      var alreadyExist = false
      if (alreadyExist && alreadyExist.length) {
        return res.json(404, {
          success: false,
          message: "Access role with same name already exist",
        });
      } else {
        var update = await global.modal["aclrole"].update(
          { _id: mongoose.Types.ObjectId(body._id) },
          { $set: body }
        );
        res.json({ success: true, data: update });
      }
    } else {
      return res.json(404, {
        success: false,
        message: "Role id required",
      });
    }
  }
);

router.get(
  "/list",
  jwtVerifier.authenticateToken,
  async function (req, res, next) {
    getAclRoles(req, res);
  }
);

router.get(
  "/listForAssignment",
  jwtVerifier.authenticateToken,
  async function (req, res, next) {
    getAclRoles(req, res);
  }
);

async function getAclRoles(req, res) {

  try {
    var query = {
      $or: [
        {
          Organisation: { $exists: false },
          Regions: { $exists: false },
          Facilities: { $exists: false }
        },
        ...(req.user.role.type == 'COMPANY_ADMIN_ROLE' || req.user.role.type == 'SYSTEM_ADMIN_ROLE'? [{
          Organisation: mongoose.Types.ObjectId(req.user.Company._id),
        }]:[]),
        ...(req.user.role.type == 'REGION_ADMIN_ROLE'?[{
          Organisation: mongoose.Types.ObjectId(req.user.Company._id),
          Regions: mongoose.Types.ObjectId(req.user.Region._id)
        }]:[]),
        ...(req.user.role.type == 'FACILITY_ADMIN_ROLE'?[{
          Organisation: mongoose.Types.ObjectId(req.user.Company._id),
          Regions: mongoose.Types.ObjectId(req.user.Region._id),
          Facilities: mongoose.Types.ObjectId(req.user.Facility)
        }]:[])
      ]
    };
    console.log(JSON.stringify(query, null, 2));
    var roleList = await global.modal["aclrole"].find(query).sort({ CreatedDate: -1 });
    if(req.user && req.user.role && req.user.role.type != 'SYSTEM_ADMIN_ROLE'){
      roleList = _.filter(roleList, (r)=>{
        return r.Name != 'System Admin'
      })
    }
    res.json({ success: true, data: roleList });
  } catch (error) {
    console.log(error);
    return res.json(404, { success: false, error: error });
  }
}

router.get(
  "/list/:id",
  jwtVerifier.authenticateToken,
  async function (req, res, next) {
    try {
      console.log(req.user);
      var aclrole = await global.modal["aclrole"].findOne({
        $and: [
          {
            _id: mongoose.Types.ObjectId(req.params.id),
          },
        ],
      });
      res.json({ success: true, data: aclrole });
    } catch (error) {
      console.log(error);
      return res.json(404, { success: false, error: error });
    }
  }
);

router.delete(
  "/delete/:id",
  jwtVerifier.authenticateToken,
  async function (req, res, next) {
    try {
      console.log(req.user);
      var isRoleAssigned = await global.modal["administrator"].find({
        ACLRole: mongoose.Types.ObjectId(req.params.id),
      });
      if (isRoleAssigned && isRoleAssigned.length) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Role can't be deleted as it is already assigned to the users",
          });
      } else {
        var aclrole = await global.modal["aclrole"].remove({
          _id: mongoose.Types.ObjectId(req.params.id),
        });
        res.json({ success: true, data: aclrole });
      }
    } catch (error) {
      console.log(error);
      return res.json(404, { success: false, error: error });
    }
  }
);

router.get("/createDefaultRoles", async function (req, res, next) {
  var arr = [
    {
      Name: "System Admin",
      Description: "System Admin",
      IsEditable: true,
    },
    {
      Name: "Organisation Admin",
      Description: "Organisation Admin",
      IsEditable: true,
    },
    {
      Name: "Region Admin",
      Description: "Region Admin",
    },
    {
      Name: "Centre Admin",
      Description: "Centre Admin",
    },
    {
      Name: "Staff",
      Description: "Staff",
    },
    {
      Name: "Parent",
      Description: "Parent",
    },
  ];
  global.modal["aclrole"].insertMany(arr, function (error, docs) {
    if (error) {
      return res.json(404, { success: false, error: error });
    } else {
      res.json({ success: true, message: "Roles added Successfully" });
    }
  });
});

module.exports = router;
