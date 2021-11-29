
'use strict';
var restify = require('express-restify-mongoose');
var _ = require('lodash');
var hooks = require('./hooks');
var filter = require('./filters');

var jwtVerifier = require('../middlewares/jwt-verifier');

module.exports = function (app, models, rawSchemas) {
  var authChain = jwtVerifier.authenticateToken;

  var sMap = {};
  schemas = _.map(rawSchemas, function (s) {
    sMap[s.name] = s;
    var _o = {
      name: s.name,
      schema: s.schema,
      base: s.base.schema,
      form: s.base.form || {},
    };

    return _o;
  });

  _.each(models, function (schema, name, i) {
    var opts = {plural: false, onError:onError};

    if (sMap[name].base.preSave) {
      sMap[name].schema.pre('save', function (next) {
        hooks.preSaveValidator(this, next, models);
        sMap[name].base.preSave.call(this, next, models);
      });
    }

  

    var logStuff = [authChain, curryMiddleware(name)]

    opts.preMiddleware = logStuff;
    opts.findOneAndUpdate = false;
    opts.findOneAndRemove = false;

    if (sMap[name].base.postRead) {
      opts.postRead = function(req, res, next) {
        sMap[name].base.postRead(req, res, next,models);
      }
    }
    if (sMap[name].base.postCreate) {
      opts.postCreate = function(req, res, next) {
        sMap[name].base.postCreate(req, res, next,models);
      }
    }
    if (sMap[name].base.preUpdate) {
      opts.preUpdate = function(req, res, next) {
        sMap[name].base.preUpdate(req, res, next,models);
      }
    }

    opts.contextFilter = function (model, req, cb) {
      filter.filterRecords(req, cb, sMap, name, model, models);
    };

    restify.serve(app, schema, opts);
  });

  var buildErrorMessages = function(err) {
    var errMsg = err.message;
    if ( err.errors ) {
      _.each( err.errors, function( val, key ) {
        if ( val && val.message ) {
          errMsg += "<br/>" + val.message;
        }
      });
    }
    return errMsg;
  }

  function onError(err, req, res, next) {
    if ( err ) {
      console.log("OnError", err);
      if(!err.statusCode || err.statusCode == 0){
       err.statusCode=400; 
      }
      console.log('err.statusCode',err.statusCode);
      res.status(err.statusCode);
      res.send(buildErrorMessages(err));
    } else next();
  }

  function curryMiddleware(name) {
    return async function(req, res, next) {
      
      if (req.method == 'POST' || req.method == 'PUT') {
        req.body = hooks.preSave(req.body, req, models[name], sMap[name]);
      }
      if ( sMap[name].base.preSaveModifiersync ) {
       req.body = await sMap[name].base.preSaveModifiersync(req.body, req,models,res, next); 
      }
      if ( sMap[name].base.preSaveModifier ) {
       req.body = sMap[name].base.preSaveModifier(req.body, req,models);
      }

      if (req.method == 'DELETE' && sMap[name].base.preDelete) {
        sMap[name].base.preDelete.call(this, req, res, next, models);
      } else {
        return next();
      }
    }
  }

};



