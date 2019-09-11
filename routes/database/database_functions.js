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

// API key for openweathermap API
var openWeatherApiKey = "dd600a6f3524bad742db42efe5147d7e";

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

// function for updating device cache data to the most current and updated data about the device
function update_device_cache_data(jsonObj){
  var date = new Date();
  log_time = date.toISOString().slice(0, 19).replace('T', ' ');
  var updateTime = log_time;

  calcAvgSpeed(jsonObj, log_time);
  add_row_to_realtime_data(jsonObj,log_time);

  device_post_counter++;
    // check after 6sec if lastUpdateTime == updateTime then NO new POST requests from end point: device is off
    // else: device is on
    setTimeout(function(){
      if(lastUpdateTime.localeCompare(updateTime) == 0){
        set_device_status(jsonObj.GSTSerial, 0); // 0 - off
        console.log(`device id: ${jsonObj.GSTSerial} - offline`);
      }
    },10000); // 8 sec

    // setting the lastUpdateTime to current updateTime
    lastUpdateTime = updateTime;

    var sql = `UPDATE devices_cache_data
               SET log_time="${updateTime}",
               device_status=1,
               latitude="${jsonObj.latitude}",
               longitude="${jsonObj.longitude}",
               sats="${jsonObj.satellites}",
               pulse="${jsonObj.pulse}",
               battery="${jsonObj.battery}",
               gps_status="${jsonObj.gps_status}",
               bt_status="${jsonObj.bt_status}",
               gsm_status="${jsonObj.gsm_status}",
               sos_status=${jsonObj.sos_status}
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
      devices_location_history (device_sn ,log_time, latitude, longitude ,pulse) 
      VALUES (${jsonObj.GSTSerial},"${log_time}","${jsonObj.latitude}","${jsonObj.longitude}","${jsonObj.pulse}");`;
      mysqlPool.query(sql, function (err, result) {
        if (err) 
           throw err;
        console.log(`device id: ${jsonObj.GSTSerial} - location history record inserted`);
      });
      device_post_counter = 0;
   }
}

// serving the latest data from device cache data
function get_device_updates(callback, device_sn){
  mysqlPool.query(`SELECT * FROM devices_cache_data WHERE device_sn = ${device_sn}`, function (error, result, fields) {
      if (error){ 
         return callback(error,result);
      }
      else{
        if(result.length == 0){
          callback(error, [{
            status : "error",
            message : `no cache data for device_id : ${device_sn}`
          }])
        }
        else{
          callback(error,result);
        }
      }
  });
}

// get information about GST devices assosicated to the app user
function get_app_user_devices(callback, user_id){
  mysqlPool.query(`SELECT device_users.device_sn, device_users.first_name, device_users.last_name, device_users.phone_number_1, device_users.phone_number_2,device_users.address
  FROM app_user_devices
  LEFT JOIN device_users
  ON app_user_devices.device_id = device_users.device_sn
  WHERE app_user_devices.user_id = ${user_id};`, function(err, result, fields){
    if(err)
      return callback(err, result);
    else{
      if(result.length == 0){
        callback(err, [{
          status:"error",
          message: `no GST devices registered with user id ${user_id}`
        }])
      }
      else{
        callback(err, result);
      }
    }
  })
}

// fetching app user information
function user_login(callback, credentials, password){
  var sql = "";

  if(credentials.includes("@"))
    // search by email
    sql = `SELECT * FROM app_users WHERE user_email = '${credentials}' AND user_pass = '${password}'`;
  else
    // search by username
    sql = `SELECT * FROM app_users WHERE user_name = '${credentials}' AND user_pass = '${password}'`;
  
    mysqlPool.query(sql, function(error, result, fields){
    if(error){
      return callback(error, result);
    }
    else{
      if(result.length == 0){
          callback(error, [{
          status : "error",
          message : "user not found"
        }])
      }
      else{
          callback(error, result); 
      }
    }
  })
}

function get_app_user_account(callback, user_id){
  mysqlPool.query(`SELECT * FROM app_users WHERE user_id = ${user_id}`,function(err, result, fields){
    if(err)
      throw err;
    else{
      callback(err, result);
    }
  })
}

// fetching location history
function get_location_history(callback,device_sn, from_date, to_date){
  var sql = `SELECT * FROM devices_location_history WHERE device_sn = ${device_sn} AND log_time >= '${from_date}' AND log_time <= '${to_date}'`
  mysqlPool.query(sql, function(error, result, fields){
    if(error){
      return callback(error, result);
    }
    else{
      if(result.length == 0){
        callback(error,[{
          status : "error",
          message : `no history records - device_id : ${device_sn}, from date: ${from_date}, to date: ${to_date}`
        }]);
      }
      else{
        callback(error, result);
      }
    }  
  });
}

function get_weather_update(callback,lat,lng){
  var url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${openWeatherApiKey}`;
  request(url, (error, response, body)=>{
    if(!error && response.statusCode === 200){
        callback(error, body);
    }
    else
        callback(error, [{
          status : "error",
          message : JSON.parse(body).message
        }])
  });
}

function post_sos_report(reportObj){
  var report_date = new Date();
  var report_log_time = report_date.toISOString().slice(0, 19).replace('T', ' ');
  // get current lat lng from cache by device_sn
  mysqlPool.query(`SELECT * FROM devices_cache_data WHERE device_sn = ${device_sn}`, function (error, result, fields) {
    if (error){ 
        return callback(error, result);
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

// function returns highest pulse measurements
function get_highest_pulse(callback, device_id){
  mysqlPool.query(`SELECT log_time, latitude, longitude, pulse
  FROM devices_realtime_data
  WHERE pulse = (SELECT MAX(pulse) FROM flora_device_data) AND device_sn=${device_id}`, function(error, results, fields){
    if(error)
       return callback(error, results);
    else{
      if(results.length == 0){
        callback(error, [{
          status : "error",
          message : `no data for device id : ${device_id}`
        }]);
      }
      else{
        callback(error , results);
      }
    }
  })
}

// function returns lowest pulse measurements
function get_lowest_pulse(callback, device_id){
  mysqlPool.query(`SELECT log_time, latitude, longitude, pulse
  FROM devices_realtime_data
  WHERE pulse = (SELECT MIN(pulse) FROM flora_device_data) AND device_sn=${device_id}`, function(error, results, fields){
    if(error)
       return callback(error, results);
    else{
      if(results.length == 0){
        callback(error, [{
          status : "error",
          message : `no data for device id : ${device_id}`
        }])
      }
      else{
        callback(error , results);
      }
    }
  })
}

function get_device_users(callback, user_id){
  if(user_id == 0){
    mysqlPool.query(`SELECT * FROM device_users`, function(err, results, fields){
      if(err){
        return callback(err, results);
      }
      else{
        callback(err, results);
      }
    });
  }
  else{
    mysqlPool.query(`SELECT * FROM device_users WHERE user_id = ${user_id}`, function(err, result, fields){
      if(err){
        return callback(err, result);
      }
      else{
        if(result.length != 0){
          callback ( err, result)
        }
        else{
          callback ( err, [{
            status:"error",
            message : "user not found"
          }])
        }
      }
    });
  }
}

function get_device_user_full_data(callback, user_id){
  mysqlPool.query(`SELECT * FROM device_users WHERE user_id = ${user_id}`, function(err, user_rows, fields){
    if(err){
      return callback(err, user_rows);
    }
    else{
      if(user_rows.length != 0){
        mysqlPool.query(`SELECT device_users_contact_relation.relation ,device_users_contacts.contact_first_name, device_users_contacts.contact_last_name, device_users_contacts.contact_address, device_users_contacts.contact_phone_number_1, device_users_contacts.contact_phone_number_2
        FROM device_users_contacts
        LEFT JOIN device_users_contact_relation
        ON device_users_contact_relation.contact_id=device_users_contacts.contact_id
        WHERE device_users_contact_relation.device_user_id = ${user_rows[0].user_id};`, function(err, result, fields){
          if(err){
            return callback(err, result);
          }
          else{
            if(result.length!=0){
              callback(err, [{
                user_id: user_id,
                user_first_name:user_rows[0].user_first_name,
                user_last_name: user_rows[0].user_last_name,
                user_address: user_rows[0].user_address,
                user_phone_number_1:user_rows[0].user_phone_number_1,
                user_phone_number_2:user_rows[0].user_phone_number_2,
                user_phone_book: result
              }])
            }
            else{
              callback(err, [{
                user_id: user_id,
                user_first_name:user_rows[0].user_first_name,
                user_last_name: user_rows[0].user_last_name,
                user_address: user_rows[0].user_address,
                user_phone_number_1:user_rows[0].user_phone_number_1,
                user_phone_number_2:user_rows[0].user_phone_number_2,
                user_phone_book: "no contacts"
              }])
            }
          }
        })
      }
      else{
        callback(err, [{
          status: "error",
          message : "user not found"
        }])
      }
    }
  })
  
}

function get_user_contacts(callback, user_id){
  mysqlPool.query(`SELECT device_users_contact_relation.relation ,device_users_contacts.contact_first_name, device_users_contacts.contact_last_name, device_users_contacts.contact_address, device_users_contacts.contact_phone_number_1, device_users_contacts.contact_phone_number_2
  FROM device_users_contacts
  LEFT JOIN device_users_contact_relation
  ON device_users_contact_relation.contact_id=device_users_contacts.contact_id
  WHERE device_users_contact_relation.device_user_id = ${user_id};`, function(err, result, fields){
    if(err){
      return callback(err, result);
    }
    else{
      if(result.length == 0){
        callback(err, [{
          status : "error",
          message : `no contacts for user ${user_id}`
        }])
      }
      else{
        callback(err,result);
      }
    }
  });
}

// adds new row to flora_device_data 
let add_row_to_realtime_data = (floraDataObj, log_time)=>{
  mysqlPool.query(`INSERT INTO devices_realtime_data (device_sn ,log_time ,latitude, longitude, satellites, pulse, battery, gps_status, bt_status, gsm_status)
  VALUES (${floraDataObj.GSTSerial}, "${log_time}", "${floraDataObj.latitude}", "${floraDataObj.longitude}",${floraDataObj.satellites},${floraDataObj.pulse},${floraDataObj.battery},${floraDataObj.gps_status},${floraDataObj.bt_status},${floraDataObj.gsm_status})`, function(err, result, fields){
    if(err)
      throw err;
  });
}

// change device status off/on (0/1)
let set_device_status = (device_sn,deviceStatus)=>{
    var sql = `UPDATE devices_cache_data SET device_status = ${deviceStatus} WHERE device_sn = ${device_sn}`;
    mysqlPool.query(sql, function (err, result) {
        if (err) 
           throw err;
    });
}

// calculates average speed between two points on a map (lat,lng)
let calcAvgSpeed = (jsonObj, time_stamp)=>{
  // get prevoius coordinates
  mysqlPool.query(`SELECT * FROM devices_cache_data WHERE device_sn=${jsonObj.GSTSerial}`, function(err, result, fields){
    if(err)
      throw err;
    else{
      var curr_lat = jsonObj.latitude;
      var curr_lon = jsonObj.longitude;
      var curr_time_stamp = new Date(time_stamp);

      var prev_lat = result[0].latitude;
      var prev_lon = result[0].longitude;
      var prev_time_stamp = new Date(result[0].log_time);

      var distance = getDistanceFromLatLonInKm(prev_lat, prev_lon, curr_lat, curr_lon);

      var timeDiffSec = (Math.abs(curr_time_stamp - prev_time_stamp))/1000;

      var avgSpeedKmh = (distance/timeDiffSec)*3600
      console.log( distance.toFixed(3)+'km', avgSpeedKmh.toFixed(3)+'km/h');

      mysqlPool.query(`UPDATE devices_cache_data 
      SET avg_speed="${avgSpeedKmh.toFixed(2)}",
      distance=${distance.toFixed(3)}
      WHERE device_sn=${jsonObj.GSTSerial}`, function(err, result, fields){
        if(err)
          throw err;
        else
          console.log("speed and distance added");
      });
    }
  })
}

// calculates distance between two points on a map (lat, lng)
let getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2)=>{
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
}

// return degree latitue/longitude to radian latitude/longitude
let deg2rad = (deg)=>{
  return deg * (Math.PI/180)
}

module.exports = {
  get_highest_pulse,
  get_lowest_pulse,
  //--------------//
  user_login,
  change_user_pass,
  check_restore_code,
  send_pass_restore_code,
  //--------------//
  post_sos_report,
  //--------------//
  get_weather_update,
  //--------------//
  update_device_cache_data,
  get_device_updates,
  //--------------//
  get_app_user_account,
  //--------------//
  get_location_history,
  //--------------//
  get_device_user_full_data,
  get_device_users,
  get_user_contacts,
  get_app_user_devices
};
  