var express = require("express");
var mongoose = require("mongoose");
var router = express.Router();
var jwtVerifier = require("../middlewares/jwt-verifier");
var _ = require('lodash');


var  createModuleTabRelations = async (modulesTabs) =>{
  var moduleTabRelation = []
  return new Promise((resolve,reject)=>{
    Promise.all(
      modulesTabs.map((moduleTab) =>{
        moduleTabRelation.push({
          RoleId: mongoose.Types.ObjectId("5f6340e821cfebade8613847"),
          ModuleId: mongoose.Types.ObjectId("5f6347a221cfebade861387b"),
          TabId:mongoose.Types.ObjectId(moduleTab._id),
          Access: true,
          Read:"All",
          Write:"All",
          Update:"All",
          Delete:"All"
        })
      })
    ).then((data) => {
      return resolve(moduleTabRelation);
    })
  })
}

router.get("/create", async function (req,res,next) {
  var arr = [
    {
      Name: 'Child Details',
      Key: 'ChildDetails',
      ModuleId: mongoose.Types.ObjectId("5f6347a221cfebade861387b")
    },
    {
      Name: 'Contacts',
      Key: 'Contacts',
      ModuleId: mongoose.Types.ObjectId("5f6347a221cfebade861387b")
    },
    {
      Name: 'Enrolments',
      Key: 'Enrolments',
      ModuleId: mongoose.Types.ObjectId("5f6347a221cfebade861387b")
    },
    {
      Name: 'Account and Fees',
      Key: 'AccountandFees',
      ModuleId: mongoose.Types.ObjectId("5f6347a221cfebade861387b")
    },
    {
      Name: 'Billing',
      Key: 'Billing',
      ModuleId: mongoose.Types.ObjectId("5f6347a221cfebade861387b")
    },
    {
      Name: 'Health',
      Key: 'Health',
      ModuleId: mongoose.Types.ObjectId("5f6347a221cfebade861387b")
    },
    {
      Name: 'Notes',
      Key: 'Notes',
      ModuleId: mongoose.Types.ObjectId("5f6347a221cfebade861387b")
    },
    {
      Name: 'Documents',
      Key: 'Documents',
      ModuleId: mongoose.Types.ObjectId("5f6347a221cfebade861387b")
    },
  ];

  global.modal["moduleTab"].insertMany(arr, async function (error, moduleTabs) {
    if (error) {
      return res.json(404, { success: false, error: error });
    } else {
      var rolemodulerelation = await createModuleTabRelations(moduleTabs);
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

router.post("/list", jwtVerifier.authenticateToken, async function (req,res,next) {
  try {
    console.log(req.user);
    var roleData = await global.modal["aclrole"].findOne({_id: mongoose.Types.ObjectId(req.body.roleId)})
    var moduleData = await global.modal["module"].findOne({_id: mongoose.Types.ObjectId(req.body.moduleId)})
    var ModuleList = await global.modal['rolemodulerelation'].aggregate([
      {
        $match:{
          RoleId: mongoose.Types.ObjectId(req.body.roleId),
          ModuleId: mongoose.Types.ObjectId(req.body.moduleId),
          TabId: { $exists: true }
        }
      },
      {
        $lookup: {
          from: "moduletabs",
          let: { tabId: "$TabId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$tabId"],
                },
              },
            },
            {
              $project: {
                Name: 1,
              },
            },
          ],
          as: "moduleTab",
        },
      },
      { $addFields: { tab: {$arrayElemAt: ['$moduleTab' , 0]}} },
      { $addFields: { tab: "$moduleTab.Name"} }
      ]);
    res.json({ success: true, data: ModuleList, roleData:roleData, moduleData: moduleData});
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
          var updateAccess = await global.modal['rolemodulerelation'].update({_id: mongoose.Types.ObjectId(access._id)},{$set:access})
          console.log(updateAccess)
        })
      ).then((data) => {
        res.json({ success: true, message:"Access data saved Success Fully"});
      })
    }
  } catch (error) {
    console.log(error)
    return res.json(404, { success: false, error: error });
  }
});


module.exports = router;
