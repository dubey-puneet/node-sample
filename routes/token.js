var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var key = require('../key.json');

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

const crypto = require('crypto-js')
const base64url = require('base64url');
/* GET users listing. */
function md5(str, encoding) {
    str = str.toString();
    return crypto.createHash('md5').update(str, 'utf8').digest(encoding || 'hex');
}
router.post('/',async function(req, res, next) {
    function sendres(){
        
        res.status(400).send('Error');
    }
    let body = req.body;
    console.log('body==================verify======================>',body)
    if(body.grant_type == 'authorization_code' && body.code && body.client_id && body.client_secret && body.code_verifier){
        let app = _.find(cc,{client_secret:body.client_secret});
        let codeChallenge = base64url.fromBase64(crypto.SHA256(body.code_verifier).toString(crypto.enc.Base64));
        console.log('app',app);
        if(!app || app.client_id != body.client_id ){
            sendres();
        }else{
            if(global['codeSession'][body.code] && global['codeSession'][body.code]['code_challenge'] == codeChallenge){
                res.json({token:global['codeSession'][body.code]['_sab']});
            }else{
                sendres();
            }
        }

    }else{
        sendres();
    }

    
});

module.exports = router;
