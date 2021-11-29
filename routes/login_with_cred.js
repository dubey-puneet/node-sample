var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var key = require('../key.json');
var crypto = require('crypto');

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

var _ = require('lodash');
var helper = require('../helper/helper');

function md5(str, encoding) {
    str = str.toString();
    return crypto.createHash('md5').update(str, 'utf8').digest(encoding || 'hex');
}
async function getUser(body){
    return new Promise(async function(resolve,reject){
        let user
        if(body.token){
            jwt.verify(body.token, key.accessToken, async function(err, decoded) {
                if(err){
                   reject('invalid token')
                } else{
                    console.log('----------decode-----------')
                    console.log(decoded)
                    console.log('----------decode-----------')
                    user = await global.modal['administrator'].findOne({
                        _id: decoded.uid
                    })
                    return resolve(user)
                }
            });
        } else{
            let pass = md5(body.password, 'base64');
            user = await global.modal['administrator'].findOne({
                username: body.username,
                password: pass
            });
            return resolve(user)
        }
    })
}
// function createNewToken(anyUser) {
//     _adForSite = jwt.sign({ name: anyUser.firstname + ' ' + anyUser.lastname, id: anyUser._id }, key.jwtKey, { expiresIn: '1d' });
//     global.modal['administrator'].update({ _id: anyUser._id }, { $set: { a_token: _adForSite } }).then(function(updated){
//         console.log('updated','user updated with token');
//     })
//     return _adForSite
// }
router.post('/', async function(req, res, next) {
    console.log("---------------------------------")
    console.log('req.body', req.body);
    console.log("---------------------------------")

    let body = req.body;

    let app = _.find(cc,{client_secret:body.client_secret});
    if(!app || app.client_id != body.client_id ){
        return res.status(400).send({
            message: 'app not found'
        });
    }
    if ((body.password && body.username) || body.token) {
        try {
            let anyUser = await getUser(body);
            if (anyUser && anyUser._id) {
                let user = {};
                 _adForSite = helper.createNewToken(anyUser,req)
                res.send(_adForSite)
            } else {
                return res.status(400).send({
                    message: 'The provided login credentials are not valid.'
                });
            }
        } catch (error) {
            console.log(error)
            res.json({})     
        }

        
    } else {
        return res.status(400).send({
            message: 'Username and password are required'
        });
    }
});module.exports = router;