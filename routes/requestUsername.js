var express = require('express');
var router = express.Router();
var mailer = require('../components/tools/email');

router.post('/', async function(req, res, next) {
    var email = req.body.email;
    global.modal['administrator'].findOne({email:email}).then(function(usr) {
      if (usr) {
        mailer.send(usr.email, "Username", "Your Username is "+usr.username);
        res.json({status:'ok', message:'Username send to your Email!  Please check your email.'});
      } else {
        return res.status(400).send({
            message: 'Account not found.'
        });
      }
    })
});

module.exports = router;