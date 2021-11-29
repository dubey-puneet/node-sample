'use strict';

var _ = require("lodash");

var access = require('./access');
//var clone = require('node-v8-clone').clone;
var clone = require('clone');

var filters = {
  filterModels: function(req, models, sMap) {
    console.log('-----models------');
    console.log(models);
    console.log('------models-----');
    var list = _.filter(models, function(m) {
      //console.log(req.user);
      var val = false;
      if (req.user) {
        val = access.hasAccessToModel(req.user, m, sMap);
      }
      return val;
    });
    console.log('list')
    console.log(list)
    console.log('list')
    _.each(list, function(m) {
      if(m && m.schema){
        console.log(m)
        _.each(m.schema.paths, function(attr) {
          //console.log(attr);
          if (attr && attr.options && attr.options.form && attr.options.form.allowedRoles) {
            var disable = true;
            _.each(attr.options.form.allowedRoles, function(role) {
              //console.log(role, req.user.role);
              if ( role == req.user.role.type ) {
                disable = false;
              }
            });
            attr.options.form.readonly = disable;
          }
          // for hiding the form field for which role they are not allowed to show
          if (attr && attr.options && attr.options.form && attr.options.form.hideFromRoles) {
            var hidden = false;
            var hideList=true;
            _.each(attr.options.form.hideFromRoles, function(role) {
              if ( role == req.user.role.type ) {
                hidden = true;
                hideList=false;
              }
            });
            if(attr.options.form.disableForm){
              hidden=true;  
            }
            attr.options.form.hidden = hidden;
            if(attr.options.hidelist){
              hideList=false;
            }
  
            attr.options.list = hideList;
  
          }
           if (attr && attr.options && attr.options.form && attr.options.form.filterEnum) {
            if(req.user.role.type=='REGION_ADMIN_ROLE'){
                attr.options.enum=['Regional', 'Provincial', 'City','Centre'];
            }else if(req.user.role.type=='FACILITY_ADMIN_ROLE'){
              attr.options.enum=['Centre'];
            }else{
              attr.options.enum=['National', 'Regional', 'Provincial', 'City','Centre'];
            }
           
  
          }
          
          if ((attr && attr.options && attr.options.form && attr.options.form.hideFromCentre) || (attr && attr.options && attr.options.form && attr.options.form.AllowedCentreType)) {
            var hidden = false;
            var hideList=true;
            if(attr.options.form.hideFromCentre){
              _.each(attr.options.form.hideFromCentre, function(centertype) {
                if ( centertype == req.user.facility.CenterType ) {
                  hidden = true;
                  hideList=false;
                }
              });
            }else if(attr.options.form.AllowedCentreType){
              _.each(attr.options.form.AllowedCentreType, function(centertype) {
  
                if ( centertype !== req.user.facility.CenterType ) {
                  hidden = true;
                  hideList=false;
                }
              });
               
            }
            
            attr.options.form.hidden = hidden;
  
            if(attr.options.hidelist){
              hideList=false;
            }
            attr.options.list = hideList;
  
          }
  
        })
      }
    });

    return list;
  },
  filterModelAttributes: function(req, model, sMap) {
    var _model = clone(model);
    var schema = sMap[model.modelName].schema;

    var attrfilter = function(m) {
      //console.log("attrfilter:"+JSON.stringify(m));
      if (req.user) {
        return access.hasAccessToAttr(req.user, _model, m, sMap);
      }
      return false;
    }

    //console.log("filtermodelattrs"+JSON.stringify(sMap[model.modelName]));

    schema.paths = _.filter(schema.paths, attrfilter);
    schema.tree = _.filter(schema.tree, attrfilter);

    return _model;
  },
  filterRecords: function (req, cb, sMap, modelName, model, models) {
   
    access.checkAccess(req, cb, sMap, modelName, req.user, model, models);
  }
};

module.exports = filters;
