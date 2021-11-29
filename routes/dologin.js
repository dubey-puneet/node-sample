var express = require('express');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var key = require('../key.json')
var helper = require('../helper/helper');
var router = express.Router();

var randomString = (length) => {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

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
                    // var decoded = jwt_decode(body.token)
                    // console.log('----------decode-----------')
                    // console.log(decoded)
                    // console.log('----------decode-----------')
                    reject('invalid token')
                    // user = await global.modal['administrator'].findOne({
                    //     _id: decoded.uid?decoded.uid:decoded.id
                    // })
                    return resolve(user)
                } else{
                    user = await global.modal['administrator'].findOne({
                        _id: decoded.uid?decoded.uid:decoded.id
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
/* GET home page. */
router.post('/', async function(req, res, next) {
    console.log("---------------------------------")
    console.log('req.body', req.body);
    console.log("---------------------------------")
    let body = req.body;
    if ((body.password && body.username) || body.token) {
        try {
            let anyUser = await getUser(body);
            if (anyUser && anyUser._id) {
                let user = {};
    
                var tokenforCore = jwt.sign({
                        sid: global.env.HOST,
                        uid: anyUser._id,
                        cid: body.client_id,
                        aid: body.redirect_uri.split('?')[0],
                    }, key.accessToken, { expiresIn: global.env.TOKENEXPIRE });
    
                let codeKey = randomString(20);
                let _adForSite = '';
                console.log('anyUser.a_token', anyUser.a_token);
                if (anyUser.a_token) {
                    await jwt.verify(anyUser.a_token, key.jwtKey, function(err, decoded) {
                        if (err) {
                            console.log('test', err)
                            _adForSite = helper.createNewToken(anyUser,req);
                        } else {
                            console.log('decoded', decoded)
                            _adForSite = anyUser.a_token
                        }
                    });
                } else {
                    _adForSite = helper.createNewToken(anyUser,req)
                }
    
                global['codeSession'][codeKey] = {
                    _sab: _adForSite,
                    code_challenge: body.code_challenge,
                    code_challenge_method: body.code_challenge_method
                }
                console.log('body.redirect_uri', body.redirect_uri)
                let redirecturl = body.redirect_uri.toString();
                res.json({
                    token: tokenforCore,
                    redirecturl: redirecturl.toString() + '&code=' + codeKey
                })
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
});


module.exports = router;