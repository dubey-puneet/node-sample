var mongoose = require("mongoose");
module.exports = {
  getModuleQuery: (moduleId) => {
    return new Promise((resolve, reject) => {
      var query = [
        {
          $match: {
            RoleId: mongoose.Types.ObjectId(moduleId),
            TabId: { $exists: false },
            ModuleId: { $exists: true },
          },
        },
        {
          $lookup: {
            from: "modules",
            let: { module: "$ModuleId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", "$$module"],
                  },
                },
              },
              {
                $project: {
                  Name: 1,
                  Key:1
                },
              },
              {
                $lookup: {
                  from: "rolemodulerelations",
                  let: { moduleId: "$_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $and: [
                            {
                              $eq: [
                                "$RoleId",
                                mongoose.Types.ObjectId(moduleId),
                              ],
                            },
                            { $eq: ["$ModuleId", "$$moduleId"] },
                          ],
                        },
                        TabId: { $exists: true },
                      },
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
                              Key:1
                            },
                          },
                        ],
                        as: "moduleTab",
                      },
                    },
                    {
                      $addFields: { tab: { $arrayElemAt: ["$moduleTab", 0] } },
                    },
                    { $addFields: { 
                        tab: "$tab.Name",
                        tabKey: "$tab.Key" 
                      } 
                    },
                  ],
                  as: "moduleTab",
                },
              },
            ],
            as: "module",
          },
        },
        { $addFields: { module: { $arrayElemAt: ["$module", 0] } } },
        {
          $addFields: {
            module: "$module.Name",
            moduleId: "$module._id",
            moduleTabs: "$module.moduleTab",
            moduleKey: "$module.Key",
          },
        },
        {
          $sort:{
            module: 1
          }
        }
      ];
      return resolve(query);
    });
  },
};
