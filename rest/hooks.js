'use strict';

var _ = require("lodash");


var hooks = {

  preSaveValidator: function(that, next, models) {
    var parse = function(obj) {
      for ( var key in obj ) {
        if (!obj.hasOwnProperty(key))
          continue;
        if ( obj[key] != null && obj[key].getTime ) {
          var date = obj[key];
          var currentDate=new Date();
          if(key==='ChildBirthDate' && date.getFullYear() < 2000 ){
              return next(new Error("Date Value:"+key+" must be greater than the year 2000!"));
          }else if(key==='ChildBirthDate' && date.getTime() > currentDate.getTime()){
              return next(new Error("Date Value:"+key+" must be Less than Today!"));
          } else if ( date.getFullYear() < 1950 )
            return next(new Error("Date Value:"+key+" must be greater than the year 1950!"));
        } else if ( obj[key] && typeof obj[key] === 'object' && key.indexOf("_") != 0 && key.indexOf("$") != 0) {
          parse(obj[key]);
        }
      }
    }
    try {
      parse(that._doc);
    } catch (e) {
    }
  },


  preSave: function (doc, req, model, schema) {
    if ( schema.base.schema.facility ) {
      if ( !doc.facility && req.user.facility) {
      
        if(req.user.facility._id != req.headers.facility){

          doc.facility = req.headers.facility;
        } else{

          doc.facility = req.user.facility._id;
        }      
      }
    }
    if (model.modelName == 'administrator' && req.user.facility ) {
      doc.Company = req.user.facility.Company?req.user.facility.Company:req.user.Company ;
      doc.Region = req.user.facility.Region?req.user.facility.Region:req.user.Region;
    }

    if ( doc._id ) {
      doc.modifiedBy = req.user._id;
      doc.lastModified = new Date();
    } else {
      doc.createdBy = req.user._id;
      doc.created = new Date();
    }
    return doc;
  }
};

module.exports = hooks;
