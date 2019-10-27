/* database other functions module */

// using npm mysql package for mysql db managment
const mysql = require('mysql');

// Nexmo API for SMS messages
const Nexmo = require('nexmo');

// using mysql connection pool to manage connections and keep the connections to mysql db alive
var mysqlPool = mysql.createPool("mysql://bbf377481226a0:eaef03fd@us-cdbr-iron-east-02.cleardb.net/heroku_99593e22b69be93?reconnect=true");




/* app user password change process */

// step 1
// application must provide credentials (email/username, password)
// if user exists in the database - serves sends an SMS message to the phone number that is registered with the application user with restore code (4 digit code)
// api returns a "success" message and sends the email of the application user for later use
function send_pass_restore_code(callback,credentials){
    var sql = "";
      // search by email
      if(credentials.includes('@')){
        sql = `SELECT * FROM app_users WHERE user_email = '${credentials}';`;
      }
      else{
        sql = `SELECT * FROM app_users WHERE user_name = '${credentials}';`;
      }
      mysqlPool.query(sql, function(error, result, fields){
        if(error){
          return callback(error, result);
        }
        else{
          if(result.length != 0){
            const nexmo = new Nexmo({
              apiKey: 'b7fc2c52',
              apiSecret: 'AjqYtGILiudrl0m9',
            });
    
            const opts = {
              "type": "unicode"
            }
            const from = 'GST';
            const to = result[0].user_contact_number;
            var min = Math.ceil(1000);
            var max = Math.floor(9999);
            const code = Math.floor(Math.random() * (max - min)) + min;
            const text = `your validation code is: ${code}`;
    
            //mysqlPool.query(`UPDATE app_users SET restore_code = '${code}' WHERE user_email = '${credentials}' OR user_name = '${credentials}'`)
    
            nexmo.message.sendSms(from, to, text,opts, (err, responseData) => {
              if (err) {
                  console.log(err);
              } else {
                  if(responseData.messages[0]['status'] === "0") {
                      console.log("Message sent successfully.");
                  } else {
                      console.log(`Message failed with error: ${responseData.messages[0]['error-text']}`);
                  } 
              }
            })
            mysqlPool.query(`UPDATE app_users SET restore_code = '${code}' WHERE user_email = '${credentials}' OR user_name = '${credentials}'`, (err, result, fields)=>{
              if(err)
                throw err;
            })
  
            callback(error, [{
              status : "OK",
              message: "SMS with restore code has been sent",
              phone_number : result[0].user_contact_number,
              email : result[0].user_email
            }]);
          }
          else{
            callback(error, [{
              status : "error",
              message: `user with credentials ${credentials} not found`,
            }])
          }
        }
    })
  }
  
  // step 2
  // application must provide the restore code from the SMS and the email address that has been sent in previous step
function check_restore_code(callback,email,res_code){
    mysqlPool.query(`SELECT * FROM app_users WHERE user_email = '${email}' AND restore_code = '${res_code}'`, (err, result, fields)=>{
      if(err)
        return callback(error, result);
      else{
        if(result.length == 0){
          callback(err, [{
            status : "error",
            message : "no user found/restore code not correct"
          }]);
        }
        else{
          callback(err, [{
            status : "OK",
            message :"validation successful",
            email : result[0].user_email
          }]);
        }
      }
    })
}
  
  // step 3
  // new password and email from step 1 is needed to change the password of the app user
function change_user_pass(callback,email,new_pass){
    mysqlPool.query(`UPDATE app_users SET 
    user_pass = '${new_pass}',
    restore_code = NULL
    WHERE user_email = '${email}'`, (err, result, fields)=>{
      if(err)
        return callback(err, result);
      else{
        if(result.affectedRows == 0){
          callback(err, [{
            status : "error",
            message : "user email not currect - password not changed"
          }])
        }
        else{
          callback(err, [{
            status : "OK",
            message : "password changed"
          }])
        }
      }
    })
}


module.exports = {
    change_user_pass,
    check_restore_code,
    send_pass_restore_code,
  };