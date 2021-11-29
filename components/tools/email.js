var nodemailer = require("nodemailer");

var key = global.env.SEND_GRID_KEY;
var transporter = nodemailer.createTransport(key);

var swig = require("swig");

const root_url = `${global.env.MAIN}/`;
var fs = require("fs");

var _send = async function (to,subject,body, attachments, cc, bcc, fromEmail, fromName, logo = 1, footer = 1, moredata
) {
  if (!moredata) {
    moredata = {
      logo: `${root_url}img/juniorlogo2.png`,
      fromEmail: "support@juniorlogs.com",
    };
  }
  var template = swig.compileFile(
    "server/components/email_templates/basic_template.html"
  );
  var output = template({
    message: body,
    root_url: root_url,
    logo: logo,
    footer: footer,
    moredata: moredata,
  });

  var mailOptions = {
    from: "Admin <notification@juniorlogs.com>", // sender address
    to: global.env.CONF_ENV == "pro"  ? to : global.env.CONF_ENV == "uat" ? 'fathimi@maceit.co.nz' :'SMSDevelopmentteam@maceit.co.nz', // list of receivers
    subject: global.env.CONF_ENV == "pro" ? subject : `${subject} (${global.env.CONF_ENV})`,
    text: output,
    html: output,
  };

  if (cc != "") {
    mailOptions.cc = cc;
  }
  if (bcc != "") {
    mailOptions.bcc = bcc;
  }
  if (fromEmail) {
    mailOptions.from = `<${fromEmail}>`;
  }

  if (attachments && (!attachments[0] || !attachments[0].path)) {
    fs.appendFile(
      "./" + attachments.filename,
      attachments.content,
      async function (err, file) {
        mailOptions.attachments = {
          filename: attachments.filename,
          path: "./" + attachments.filename,
        };
        await sendEmail(transporter, mailOptions);
        fs.unlinkSync("./" + attachments.filename);
      }
    );
  } else {
    if (attachments) mailOptions.attachments = attachments;
    await sendEmail(transporter, mailOptions);
  }
};

module.exports = {
  send: _send,
};
function sendEmail(transporter, mailOptions) {
  return new Promise(async (resolve, reject) => {
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        return console.log(error);
      }
      console.log("Message sent: " + info.response);
      return resolve(true);
    });
  });
}
