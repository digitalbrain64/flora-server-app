/* database functionality module */
/* contains all neccesery database functions for internal use and export */

// using npm mysql package for mysql db managment
const mysql = require('mysql');

// Nexmo API for SMS messages
const Nexmo = require('nexmo');

// request for http requests
const request = require('request');

// using mysql connection pool to manage connections and keep the connections to mysql db alive
var mysqlPool = mysql.createPool("mysql://bbf377481226a0:eaef03fd@us-cdbr-iron-east-02.cleardb.net/heroku_99593e22b69be93?reconnect=true");

// last update time will be changed dynamically
var lastUpdateTime;

var log_time;

var device_post_counter = 0;

var ipLocationApiAccessKey = "access_key=ffeeaec15d17aabd228c7499107f1830&format=1";

var ipLocationApi = "http://api.ipstack.com/"

var currentIP = '';

// API key for openweathermap API
var openWeatherApiKey = "dd600a6f3524bad742db42efe5147d7e";

// function for updating device cache data to the most current and updated data about the device
function update_device_cache_data(jsonObj,ip){
  currentIP = ip;
  var date = new Date();
  log_time = date.toISOString().slice(0, 19).replace('T', ' ');
  var updateTime = log_time;
  device_post_counter++;
    // check after 6sec if lastUpdateTime == updateTime then NO new POST requests from end point: device is off
    // else: device is on
    setTimeout(function(){
      if(lastUpdateTime.localeCompare(updateTime) == 0){
        set_device_status(jsonObj.GSTSerial, 0); // 0 - off
        console.log(`device id: ${jsonObj.GSTSerial} - offline`);
      }
    },8000); // 8 sec

    // setting the lastUpdateTime to current updateTime
    lastUpdateTime = updateTime;

    // var current_latlng = {
    //   source : 'gps',
    //   lat : parseFloat(jsonObj.latitude)/100,
    //   lng : parseFloat(jsonObj.longitude)/100
    // }

    // current_latlng = check_location_fix(current_latlng);

    var sql = `UPDATE device_cache_data
               SET log_time="${updateTime}",
               device_status=1,
               latitude="${parseFloat(jsonObj.latitude)/100}",
               longitude="${parseFloat(jsonObj.longitude)/100}",
               sats="${jsonObj.satellites}",
               pulse="${jsonObj.pulse}",
               battery="${jsonObj.battery}",
               gps_status="${jsonObj.gps_status}",
               bt_status="${jsonObj.bt_status}",
               gsm_status="${jsonObj.gsm_status}"
               WHERE device_sn=${jsonObj.GSTSerial};`;

    mysqlPool.query(sql, function (err, result) {
      if (err) 
         throw err;
      console.log(`device id: ${jsonObj.GSTSerial} - online`);
      console.log(`device id: ${jsonObj.GSTSerial} - cache data updated`);
    });

    // if 5min has passed -> insert record to device_location_history
    if(device_post_counter == 50){
      var sql = `INSERT INTO 
      device_location_history (device_sn ,log_time, latitude, longitude ,pulse) 
      VALUES (${jsonObj.GSTSerial},"${log_time}","${parseFloat(jsonObj.latitude)/100}","${parseFloat(jsonObj.longitude)/100}","${jsonObj.pulse}");`;
      mysqlPool.query(sql, function (err, result) {
        if (err) 
           throw err;
        console.log(`device id: ${jsonObj.GSTSerial} - location history record inserted`);
      });
      device_post_counter = 0;
   }
}

/*
// handle gps module incorrect latitude/longitude data
function check_location_fix(current_latlng){

  // if the difference in latitude or longitude is more then 0.0014 from the previous data then try other resources for fetching location
  if((Math.abs(current_latlng.lat - prev_latlng.lat) > 0.0014 || Math.abs(current_latlng.lng - prev_latlng.lng) > 0.0014)){
    
    var url = `${ipLocationApi}${currentIP}?${ipLocationApiAccessKey}`;
    
    // try get location from IP location api (ipstack api)
    request(url, (error, response, body)=> {
      // in case of success = change the lat and lng in current_latlng
      // assign current_latlng.source to 'api'
      if (!error && response.statusCode === 200) {
        const apiResponse = JSON.parse(body)
        //console.log(`lat from api: ${apiResponse.latitude}\n lng from api: ${apiResponse.latitude}`);
        current_latlng.lat = apiResponse.latitude;
        current_latlng.lng = apiResponse.longitude;
        current_latlng.source = 'api';
        console.log("location from api");
      } 
      else {
        // unsuccessful fetching from api = assign 0 lat and 0 lng to current_latlng
        // assign current_latlng to 'none'
        current_latlng.lat = '00.00000';
        current_latlng.lng = '00.00000';
        current_latlng.source = 'none';
        console.log("location from none");
        
        //console.log("Got an error: ", error, ", status code: ", response.statusCode)
      }

    })
  }
  else{
    console.log("location from gps");
    current_latlng.source = "gps";
    prev_latlng = current_latlng;
    
  }
  console.log(`\ncurrent_latlng: ${current_latlng.lat}, ${current_latlng.lng}\nprev_latlng: ${prev_latlng.lat}, ${prev_latlng.lng}\n`);

  return current_latlng;
}
*/


// change device status off/on (0/1)
var set_device_status = (device_sn,deviceStatus)=>{
    var sql = `UPDATE device_cache_data SET device_status = ${deviceStatus} WHERE device_sn = ${device_sn}`;
    mysqlPool.query(sql, function (err, result) {
        if (err) 
           throw err;
    });
}

// serving the latest data from device cache data
function get_user_data_from_cache(callback, device_sn){
  mysqlPool.query(`SELECT * FROM device_cache_data WHERE device_sn = ${device_sn}`, function (error, result, fields) {
      if (error){ 
          throw error;
      }
      return callback(error,result); // return callback function
  });
}

// fetching app user information
function get_user(callback, credentials, password){
  var sql = "";

  if(credentials.includes("@"))
    // search by email
    sql = `SELECT * FROM app_users WHERE user_email = '${credentials}' AND user_pass = '${password}'`;
  else
    // search by username
    sql = `SELECT * FROM app_users WHERE user_name = '${credentials}' AND user_pass = '${password}'`;
  
    mysqlPool.query(sql, function(error, result, fields){
    if(error){
      throw error;
    }
    return callback(error, result); // return callback function

  })
}

// fetching location history
function get_location_history(callback,device_sn, from_date, to_date){
  var sql = `SELECT * FROM device_location_history WHERE device_sn = ${device_sn} AND log_time >= '${from_date}' AND log_time <= '${to_date}'`
  mysqlPool.query(sql, function(error, result, fields){
    if(error){
      throw error;
    }
    return callback(error, result); // return callback function
  });
}

function get_weather_update(callback,lat,lng){
  var url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${openWeatherApiKey}`;
  request(url, (error, response, body)=>{
    if(!error && response.statusCode === 200){
      return callback(error, body);
    }
    else
      throw error;
  });
}


function post_sos_report(reportObj){
  var report_date = new Date();
  var report_log_time = report_date.toISOString().slice(0, 19).replace('T', ' ');
  // get current lat lng from cache by device_sn
  mysqlPool.query(`SELECT * FROM device_cache_data WHERE device_sn = ${device_sn}`, function (error, result, fields) {
    if (error){ 
        throw error;
    }
    var lat = result.latitude, lng = result.longitude;
    var pulse = result.pulse;
    var sql = `INSERT INTO 
      sos_reports (device_sn ,log_time, employee_id, latitude, longitude ,pulse, amb_dispatched, sos_description, relatives_alerted) 
      VALUES (${reportObj.GSTSerial},"${report_log_time}","${lat}","${lng}",${pulse},${reportObj.amb}, "${reportObj.sos_description}", ${reportObj.relatives_alerted});`;
      mysqlPool.query(sql, function (err, result) {
        if (err) 
           throw err;
        console.log(`device id: ${reportObj.GSTSerial} - sos report inserted`);
      });
  });
}

// step 1
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
        throw error;
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
                    mysqlPool.query(`UPDATE app_users SET restore_code = '${code}' WHERE user_email = '${credentials}'`, (err, result, fields)=>{
                      if(err)
                        throw err;
                    })
                } else {
                    console.log(`Message failed with error: ${responseData.messages[0]['error-text']}`);
                } 
            }
          })
          callback(error, {
            status : "OK",
            message: "SMS with restore code has been sent",
            phone_number : result[0].user_contact_number,
            email : result[0].user_email
          });
        }
        else{
          callback(error, {
            error: "no user found"
          })
        }
      }
        
  })
}

// step 2
function check_restore_code(callback,email,res_code){
  mysqlPool.query(`SELECT * FROM app_users WHERE user_email = '${email}' AND restore_code = '${res_code}'`, (err, result, fields)=>{
    if(err)
      throw err;
    else{
      if(result.length == 0){
        callback(err, {
          error : "no user found/restore code not correct"
        });
      }
      else{
        callback(err, {
          status : "OK",
          message :"validation successful",
          email : result[0].user_email
        });
      }
    }
  })
}

// step 3
function change_user_pass(callback,email,new_pass){
  mysqlPool.query(`UPDATE app_users SET 
  user_pass = '${new_pass}',
  restore_code = NULL
  WHERE user_email = '${email}'`, (err, result, fields)=>{
    if(err)
      throw err;
    else{
      callback(err, {
        status : "OK",
        message : "password changed"
      })
    }
  })
}

module.exports = {
  change_user_pass,
  check_restore_code,
  get_pass_restore_code: send_pass_restore_code,
  post_sos_report,
  get_weather_update,
  update_device_cache_data,
  get_user_data_from_cache,
  get_user,
  get_location_history
};
  