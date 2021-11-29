var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var key = require('../key.json')

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

var crypto = require('crypto');
var _ = require('lodash');


var randomString = (length) => {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
function createNewToken(anyUser) {
    _adForSite = jwt.sign({ name: anyUser.firstname + ' ' + anyUser.lastname, id: anyUser._id }, key.jwtKey, { expiresIn: '8h' });
    global.modal['administrator'].update({ _id: anyUser._id }, { $set: { a_token: _adForSite } }).then(function(updated){
        console.log('updated','user updated with token');
    })
    return _adForSite
}

function loginpage(res, redirectUrl, q,req) {
    let errorMes = '';
        if (req.query.error01 == '') {
            errorMes = 'Missing credential!!';
        }
        if (req.query.error02 == '') {
            errorMes = 'No user found';
        }
        console.log('global.env.APP_URL',global.env.APP_URL);

        const ua = req.headers['user-agent'];
        // console.log(ua);
        if(/^Postman/i.test(ua) ){
            res.json({url: `${global.env.APP_URL}/#/login?redirect_uri=${redirectUrl.toString()}&state=${q.state}&client_id=${q.client_id}&code_challenge=${q.code_challenge}&code_challenge_method=${q.code_challenge_method}&errorMes=${errorMes}`});
        } else {
            res.redirect(301, 
                `${global.env.APP_URL}/#/login?redirect_uri=${redirectUrl.toString()}&state=${q.state}&client_id=${q.client_id}&code_challenge=${q.code_challenge}&code_challenge_method=${q.code_challenge_method}&errorMes=${errorMes}`
            );
        }

        
    // res.render('index', {
    //     title: 'Please login',
    //     redirect_uri: redirectUrl.toString() + '?state=' + q.state,
    //     'client_id': q.client_id,
    //     'code_challenge': q.code_challenge,
    //     'code_challenge_method': q.code_challenge_method,
    //     errorMes: errorMes
    // });
}
/* GET home page. */
router.get('/', async function(req, res, next) {
    // console.log('req.body', req.query);
    let q = req.query;
    let app = _.find(cc, { client_id: q.client_id });

    if (q.response_type == 'code' && app && app.registered_urls.indexOf(q.redirect_uri) != -1) {
        let redirectUrl = req.query.redirect_uri;
        return loginpage(res, redirectUrl, q, req);
    } else {
        return res.send('Err No app found!!');
    }
});

module.exports = router;