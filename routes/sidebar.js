var express = require("express");
var router = express.Router();
var _ = require("lodash");
var jwtVerifier = require("../middlewares/jwt-verifier");

router.get(
  "/sidebarData",
  jwtVerifier.authenticateToken,
  async function (req, res, next) {
    try {
      console.log(req.user);
      var query = [
        {
          $match: {
            Access: true,
            RoleId: req.user.ACLRole._id,
            TabId: { $exists: false },
          },
        },
        {
          $lookup: {
            from: "modules",
            let: { id: "$ModuleId" },
            pipeline: [
              {
                $match: { $expr: { $eq: ["$_id", "$$id"] } },
              },
              {
                $lookup: {
                  from: "modulegroups",
                  let: { moduleGroup: "$ModuleGroup" },
                  pipeline: [
                    {
                      $match: { $expr: { $eq: ["$_id", "$$moduleGroup"] } },
                    },
                  ],
                  as: "ModuleGroup",
                },
              },
              {
                $unwind: {
                  path: "$ModuleGroup",
                  preserveNullAndEmptyArrays: true,
                },
              },
            ],
            as: "ModuleId",
          },
        },
        { $unwind: { path: "$ModuleId", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$ModuleId.ModuleGroup._id",
            title: { $first: "$ModuleId.ModuleGroup.Name" },
            icon: { $first: "$ModuleId.ModuleGroup.icon" },
            order: { $first: "$ModuleId.ModuleGroup.order" },
            subMenus: { $first: "$ModuleId.ModuleGroup.subMenus" },
            sub: { $push: "$ModuleId" },
          },
        },
        { $sort: { order: 1 } },
      ];
      var sideBarData = await global.modal["rolemodulerelation"].aggregate(query);

      sideBarData.forEach(sideBarElement => {
        sideBarElement.sub.forEach(element => {
          element.Name =  element.Name.trim();
        });
      });

      sideBarData.forEach(sideBarElement => {
        sideBarElement.sub =  _.sortBy(sideBarElement.sub, ["Name"]);
      });

      return res.json({data: sideBarData});
    } catch (error) {
      return res.json(404, { success: false, error: error });
    }
  }
);

module.exports = router;
