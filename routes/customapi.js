var express = require("express");
var router = express.Router();
var jwtVerifier = require("../middlewares/jwt-verifier");
var request = require("request");

router.get(
  "/addressaccesstoken",
  jwtVerifier.authenticateToken,
  async function (req, res, next) {
    request.post(
      {
        url: "https://oauth.nzpost.co.nz/as/token.oauth2",
        form: {
          grant_type: "client_credentials",
          client_id: "91490233f1f3485db760c6bbe2475e86",
          client_secret: "260861EdB03040E2aFd79F3BD06D14B8",
        },
      },
      function (error, response, body) {
        if (error) {
          res.json({ status: false, message: JSON.stringify(error) });
        }
        res.json({ status: true, data: JSON.parse(body) });
      }
    );
  }
);

router.get(
  "/getaddressdetails",
  jwtVerifier.authenticateToken,
  function (req, res) {
    request.get(
      {
        url:
          "https://api.nzpost.co.nz/parceladdress/2.0/domestic/addresses/" +
          req.query.address_id,
        headers: {
          Authorization: "Bearer " + req.query.token,
          Accept: "application/json",
        },
      },
      function (error, response, body) {
        try {
          if (error) {
            res.json({ status: false, message: JSON.stringify(error) });
          }
          res.json({ status: true, data: JSON.parse(body) });
        } catch (err) {
          console.log("err", err);
          res.json({ status: false, message: "Some error occured" });
        }
      }
    );
  }
);

router.get("/findaddress", jwtVerifier.authenticateToken, function (req, res) {
  request.get(
    {
      url:
        "https://api.nzpost.co.nz/parceladdress/2.0/domestic/addresses?q=" +
        req.query.address +
        "&count=8",
      headers: {
        Authorization: "Bearer " + req.query.token,
        Accept: "application/json",
      },
    },
    function (error, response, body) {
      try {
        if (error) {
          return res.json({ status: false, message: JSON.stringify(error) });
        }
        res.json({ status: true, data: JSON.parse(body) });
      } catch (err) {
        console.log("Error on nz post file customapi line 178");
      }
    }
  );
});

module.exports = router;
