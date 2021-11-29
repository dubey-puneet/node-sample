var express = require('express');
var router = express.Router();
var mailer = require('../components/tools/email');
var jwt = require('jsonwebtoken');
var key = require('../key.json');
var crypto = require('crypto');
var jwtVerifier = require('../middlewares/jwt-verifier')

function md5(str, encoding) {
  str = str.toString();
  return crypto.createHash('md5').update(str, 'utf8').digest(encoding || 'hex');
}


router.post('/requestLink', async function(req, res, next) {
    var email = req.body.email;
    global.modal['administrator'].findOne({ email: email}).then(async function(usr) {
      if (usr) {
        console.log(usr)
        var tokenforCore = jwt.sign({
          sid: global.env.HOST,
          uid: usr._id
        }, key.accessToken, { expiresIn: '24h' });
        await global.modal['administrator'].updateOne(
          { _id: usr._id },
          { $set: { resetPasswordToken: tokenforCore } }
        );
        var resetPasswordHtml = `<p>Hi ${usr.firstname} ${usr.lastname},</p>
        <br>
        <p>We recieved a request to reset your password. </p>
        <br>
        <p>click here <a href="https://${global.env.HOST}/#/resetPassword?token=${tokenforCore}"> reset password </a> to reset your password.</p>`;
        mailer.send(usr.email,'Reset password link', resetPasswordHtml);
        res.json({
          message:'Reset passwored link sent to your Email!  Please check your email.',
          token: tokenforCore
        });
      } else {
        return res.status(400).send({
            message: 'Account not found.'
        });
      }
    })
});

router.post('/verifyToken', jwtVerifier.authenticateToken, async function(req, res, next) {
  var user = req.user;
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  try {
    var admin = await global.modal['administrator'].findOne({ _id: user._id });
    console.log(admin)
    if(token.toString() ==  admin.resetPasswordToken){
      res.json({ 
        message: 'token verified',
        success: true
      });
    }else{
      return res.status(400).send('Invalid token');
    }
  } catch (error) {
    return res.status(400).send(error);
  }
});

router.post('/setNew', jwtVerifier.authenticateToken, async function(req, res, next) {
  var user = req.user;
  let password  = md5(req.body.password, 'base64');

  try {
    console.log(user.uid)
    var updatePassword = await global.modal['administrator'].updateOne(
      { _id: user._id },
      { $set: { password: password, verifypassword: password, resetPasswordToken:'' } }
    );
    res.json(updatePassword);
  }
  catch(e){
    return res.status(400).send(e);
  }
})

module.exports = router;