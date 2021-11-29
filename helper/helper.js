var key = require('../key.json')
var jwt = require('jsonwebtoken');

module.exports = {
  createNewToken: function (anyUser, req) {
    var _adForSite = jwt.sign({
      name: anyUser.firstname + ' ' + anyUser.lastname,
      id: anyUser._id
    }, key.jwtKey, {
      expiresIn: global.env.TOKENEXPIRE
    });
    global.modal['administrator'].update({
      _id: anyUser._id
    }, {
      $set: {
        a_token: _adForSite
      }
    }).then(function (updated) {
      console.log('User token updated');
    })
    if (req && req.headers && req.headers.origin) {
      global['socket'].emit(anyUser._id, 'refreshtoken-' + req.headers.origin)
    }
    return _adForSite
  }
}

return module.exports;
