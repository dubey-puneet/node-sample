var express = require('express');
var router = express.Router();
router.get('/', async function(req, res, next) {
    let backURL = req.query['redirect_uri'] || '/';

    console.log("-------backURL----------")
    console.log(backURL)
    console.log("-------backURL----------")
    if(backURL){
        res.clearCookie('_ab');
        return res.redirect(301, 
            `/#/login`
        );
    }
    res.send('Err No app found!!');
});
module.exports = router;
