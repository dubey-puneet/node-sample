var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var crypto = require('crypto');
var key = require('../key.json');
var fs = require('fs');
var moment = require('moment');
const mongoose = require('mongoose');
var _ = require('lodash');

var cc;
if(process.env.file === 'loc') {
    cc = require('../cc_loc.json');
} else if(process.env.file === 'dev') {
    cc = require('../cc_dev.json');
} else if(process.env.file === 'uat') {
    cc = require('../cc_uat.json');
}  else {
    cc = require('../cc_.json');
}

var helper = require('../helper/helper')
const jwt_decode = require('jwt-decode');

/* GET users listing. */
function md5(str, encoding) {
    str = str.toString();
    return crypto.createHash('md5').update(str, 'utf8').digest(encoding || 'hex');
}
router.post('/',async function(req, res, next) {
    let body = req.body;
    console.log('body',body);
    console.log(global.env.HOST);

    if(body.grant_type == 'refresh'){
        function afterVeriFy(decoded){
            

            fs.readFile(moment().format('DD-MM-YYYY')+'.json',"utf8",async function(err,content){
                console.log('content',moment().format('DD-MM-YYYY')+'.json',content);
                if(content){
                    content = JSON.parse(content);
                    if(content['revokeTokens'].indexOf(body.token)!=-1){
                        res.status(401).send(false);
                    }else{
                        if(req.headers && req.headers.reqorigin && req.headers.reqorigin.includes('core')){
                            res.json({token:body.token});
                        }else{
                            res.send( body.token);
                        }
                     }
                }else{
                    if(req.headers && req.headers.reqorigin && req.headers.reqorigin.includes('core')){
                        res.json({token:body.token});
                    }else{
                        res.send( body.token);
                    }
                }
                
            })
           
        }
        async function onerror(){
            var decoded = jwt_decode(body.token)
            var anyUser = await global.modal['administrator'].findOne({
                _id: decoded.uid?decoded.uid:decoded.id
            })
            if(anyUser._id && anyUser.a_token){
                await jwt.verify(anyUser.a_token, key.jwtKey, function(err, decoded) {
                    if (err) {
                        res.status(401).send(false);
                    } else {
                            if(req.headers && req.headers.reqorigin && req.headers.reqorigin.includes('core')){
                                res.json({token:anyUser.a_token});
                            }else{
                                res.send( anyUser.a_token);
                            }
                    }
                });
            }else{
                res.status(401).send(false);
            }
            
        }
        
        jwt.verify(body.token, key.accessToken, function(err, decoded) {
            if(err){
                jwt.verify(body.token, key.jwtKey, function(err, decoded) {
                    if(err){
                        onerror();
                    }else{
                        afterVeriFy(decoded);
                    }
                })
            }else{
                afterVeriFy(decoded);
            }
        } );   
    }else{
        res.status(401).send(false);
    }
     
});





module.exports = router;
