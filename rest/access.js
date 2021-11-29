'use strict';

var _ = require("lodash");

var access = {
  hasAccessToAttr: function(user, model, attr, sMap) {
    //console.log("hasAccesstoAttr"+attr, model, model.modelName);
    //console.log(sMap[model.modelName]);
    //if ( sMap[model.modelName].attrFilter ) {
    //  return sMap[model.modelName].attrFilter(sMap, user, attr);
    //} else
      return true;
  },

  hasAccessToModel: function(user, model, schemaMap) {

    // todo implement business rules for model filtering
    /**
     * pull out role from user
     * if role
     */
    var match = function(model) {
      return function(obj) {
        return obj === model.modelName;
      }
    }

    var roletype = '';
    if (user._role) {
      roletype = user._role.type;
    } else if ( user.role ) {
      roletype = user.role.type;
    }

    var facilityList = ['permissions','child','dutylist','childnotestype', 'parent','contact', 'staff', 'administrator', 'room', 'temporaryClosure', 'holiday', 'session', 'educator', 'eceserviceschedule','licenseconfiguration','city','childenrolmentenquiry', 'suburb','feestable','hourly_fees'];
    var regionList = ['facility'].concat(facilityList);
    var companyList = ['region', 'administrator'].concat(regionList);

    if (roletype === 'SYSTEM_ADMIN_ROLE') {
      return true;
    } else  if ( roletype === 'COMPANY_ADMIN_ROLE' ) {
      return _.filter(companyList, match(model)).length > 0;
    } else  if ( roletype === 'REGION_ADMIN_ROLE' ) {
      return _.filter(regionList, match(model)).length > 0;
    } else if ( roletype === 'FACILITY_ADMIN_ROLE' ) {
      return _.filter(facilityList, match(model)).length > 0;
    }

    return false
  },
  checkAccess: function(req, cb, sMap, modelName, user, model, models) {
    // populate our user object

    // filter
    // check if access is set to all for sys level items
    var q = null;
    var isSysWOFac = req.user.role.index == 0 && !req.user.facility;

    if ( isSysWOFac || (sMap[modelName].base.access && sMap[modelName].base.access === 'all') ) {
      q = model.findSync();
    } else if (sMap[modelName].base.accessConstraint) {
      
     // q = model.findSync(sMap[modelName].base.accessConstraint(req.user));
     q = model.findSync(sMap[modelName].base.accessConstraint(req.user,models,req));
      
    } else if (sMap[modelName].base.postFilterConstraint) {
      sMap[modelName].base.postFilterConstraint(req.user, cb, model, models, sMap[modelName].base.populate);
    } else {
      //console.log(req);
      var query=req.query;
      if(query['from']=='eliview'){
        q = model.findSync();
      }else{

        var user_facility = req.user.facility._id?req.user.facility._id:req.user.facility;
        var headers_facility = req.headers.facility;
        var final_facility = null;

        if(headers_facility != user_facility)
          final_facility = headers_facility;
        else
          final_facility = user_facility;

        q = model.findSync(
          {
            facility: final_facility
          }
        );
      }
      
    }

    if ( sMap[modelName].base.populate ) {
      q = q.populate(sMap[modelName].base.populate);
    }
    cb(q);

  }



};

module.exports = access;
