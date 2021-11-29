var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    console.log('req.body',req.query);
    let errorMes = '';
    console.log("------------sasssa----------------")
    console.log(req.query.redirect_uri+'&code='+req.query.code)
    console.log("------------sasassasa----------------")
    setTimeout(function(){
        res.redirect(req.query.redirect_uri+'&code='+req.query.code);
    },500)
});

module.exports = router;
