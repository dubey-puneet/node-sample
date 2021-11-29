var express = require("express");
var router = express.Router();
var crypto = require("crypto");
var jwtVerifier = require("../middlewares/jwt-verifier");
var filter = require('../rest/filters');
var _ = require("lodash");
var schemas = require('../schemas_'); 



var sMap = {};
var _preSaveMap = {};
schemas = _.map(schemas, function (s) {
    sMap[s.name] = s;
    var _o = {
        name: s.name,
        schema: s.schema,
        base: s.base.schema,
        form: s.base.form || {},
    };

    return _o;
});


router.get("/getData/:modal",jwtVerifier.authenticateToken, async function (req, res, next) {
    try {
        var modal = req.params.modal;
        console.log(global.modal[modal]);
        if(global.modal[modal]){
            var filtered = filter.filterModels(req, [global.modal[modal]], sMap, modal);
            console.log('---------filtered-------')
            console.log(filtered)
            console.log(filtered.length)
            console.log('---------filtered-------')
            
            var filteredMap = _.reduce(filtered,function (o, item) {
                        o[item.modalName] = true;
                        return o;
                    },
                {}
            );
            console.log(sMap[modal])
            console.log(filteredMap)
            if(sMap && sMap[modal] &&  sMap[modal].name){
                var neMap = {
                    name: sMap[modal].name,
                    schema: sMap[modal].schema,
                    base: sMap[modal].base.schema,
                    form: sMap[modal].base.form || {},
                };
                neMap = _.extend(neMap, {
                    hasAccess: filteredMap[modal],
                    sortOrder: sMap[modal].sortOrder,
                });
                return res.json( neMap );
            } else{
                return res.status(404).json({success: false, message:'no schema found'});
            }
        } else{
            return res.status(404).json({success: false, message:'no schema found'});
        }
    } catch (error) {
        console.log(error);
    }
  }
);

module.exports = router;
