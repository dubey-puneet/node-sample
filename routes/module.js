var express = require("express");
var mongoose = require("mongoose");
var router = express.Router();
var jwtVerifier = require("../middlewares/jwt-verifier");
var _ = require('lodash');
const { json } = require("express");
var moduleQuery = require("../common/moduleQuery");


var  createModuleRoleRelations = async (modules, defaultRoles) =>{
  var rolemodulerelation = []
  return new Promise((resolve,reject)=>{
    Promise.all(
      defaultRoles.map((aclRole) =>{
        Promise.all(
          modules.map((module) =>{
            rolemodulerelation.push({
              RoleId: mongoose.Types.ObjectId(aclRole._id),
              ModuleId: mongoose.Types.ObjectId(module._id),
              Access: false,
              Read:"All",
              Write:"All",
              Update:"All",
              Delete:"All"
            })
          })
        )
      })
    ).then((data) => {
      return resolve(rolemodulerelation);
    })
  })
}



router.get("/create", async function (req,res,next) {
  var arr = [
    {
      Name: 'ACL',
      Key: 'acl',
      Link:'/#/list/roles',
      ModuleGroup:'List View'
    },
    {
      Name: 'Roster',
      Key: 'roster',
      Link:'/#/main/newroster',
      ModuleGroup:'Staff Records'
    },
    {
      Name: "Children",
      Key: 'child',
      Link:'/#/main/formly/list/child',
      ModuleGroup:'List View'
    },
    {
      Name: "Attendance Marking",
      Key: 'attendance',
      Link:'/#/main/addAttendance',
      ModuleGroup:'Attendance'
    }
  ];

  global.modal["module"].insertMany(arr, async function (error, modules) {
    if (error) {
      return res.json(404, { success: false, error: error });
    } else {
      // res.json({ success: true, message: "Modules added Successfully" });
      var defaultRoles = await global.modal["aclrole"].find({});
      var rolemodulerelation = await createModuleRoleRelations(modules, defaultRoles);
      console.log('--------------')
      console.log(rolemodulerelation)
      console.log('--------------')
      if(rolemodulerelation.length){
        global.modal['rolemodulerelation'].insertMany(rolemodulerelation, function (error, modules) {
          if (error) {
            return res.json(404, { success: false, error: error });
          } else {
            res.json({ success: true, message: "Modules added Successfully" });
          }
        })
      }
    }
  });
});

/* This code will be used if we need to create roles through form */

// router.get("/createRoleModuleRelation", async function (req,res,next) {
//   var rolemodulerelation = {
//     RoleId: mongoose.Types.ObjectId("5f5b762b7e10e41abce452e1"),
//     ModuleId: mongoose.Types.ObjectId("5f5dccecd3ffa86b143f9589")
//   };

//   var newRolemodulerelation = global.modal['rolemodulerelation'](rolemodulerelation);
//   newRolemodulerelation.save(function (err, roleData) {
//     if (err) {
//       console.log(err);
//       return res.json(404, { success: false, error: err });
//     } else {
//       res.json({ success: true, data: roleData });
//     }
//   });
// });


router.get("/list/:id", jwtVerifier.authenticateToken, async function (req,res,next) {
  try {
    var roleData = await global.modal["aclrole"].findOne({_id: mongoose.Types.ObjectId(req.params.id)})
    console.log("-------------------------")
    // console.log(req.user._id.toString() == roleData.CreatedBy.toString())
    console.log("-------------------------")
    var query = await moduleQuery.getModuleQuery(req.params.id);
    console.log(JSON.stringify(query, null, 2))
    var ModuleList = await global.modal['rolemodulerelation'].aggregate(query);
    res.json({ success: true, data: ModuleList, roleData:roleData});
  } catch (error) {
    console.log(error)
    return res.json(404, { success: false, error: error });
  }
});

router.post("/updateAccess", jwtVerifier.authenticateToken, async function (req,res,next) {
  try { 
    console.log(req.body)
    body = req.body
    if(body.moduleAccessData && body.moduleAccessData.length){
      Promise.all(
        body.moduleAccessData.map(async (access) =>{
          if (access.moduleTabs && access.moduleTabs.length) {
            Promise.all(
              access.moduleTabs.map(async (tabAccess) =>{
                await global.modal['rolemodulerelation'].update({_id: mongoose.Types.ObjectId(tabAccess._id)},{$set:tabAccess})
              })
            ).then(async () => {
              await global.modal['rolemodulerelation'].update({_id: mongoose.Types.ObjectId(access._id)},{$set:access})
            })
          } else{
            await global.modal['rolemodulerelation'].update({_id: mongoose.Types.ObjectId(access._id)},{$set:access})
          }
        })
      ).then((data) => {
        res.json({ success: true, message:"Access data saved Success Fully"});
      })
    }else{
      return res.json(404, { success: false, error: "No data found" });
    }
  } catch (error) {
    console.log(error)
    return res.json(404, { success: false, error: error });
  }
});




module.exports = router;
