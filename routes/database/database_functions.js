/* database functionality module */
/* contains all neccesery database functions for internal use and export */

// using npm mysql package for mysql db managment
const mysql = require('mysql');

// connection to floraserverapp database
const connection = mysql.createConnection("mysql://bbf377481226a0:eaef03fd@us-cdbr-iron-east-02.cleardb.net/heroku_99593e22b69be93?reconnect=true");

// last update time will be changed dynamically
var lastUpdateTime;

var device_post_counter = 0;


// POST data to flora_device_data table
function post_data_from_flora_device(jsonObj){
    var date = new Date();
    var log_time = `${date.getUTCDate()}-${date.getMonth()}-${date.getFullYear()}_${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
    var sql = `INSERT INTO 
    flora_device_data (log_time,device_sn, latitude, longitude,satellites,pulse, battery, gps_status, bt_status, gsm_status) 
    VALUES ("${log_time}","${jsonObj.GSTSerial}","${jsonObj.latitude}","${jsonObj.longitude}","${jsonObj.satellites}","${jsonObj.pulse}","${jsonObj.battery}","${jsonObj.gps_status}","${jsonObj.bt_status}","${jsonObj.gsm_status}");`;  
    
    // updating cache_table
    update_device_cache_data(jsonObj, log_time);

    // sending to database
    connection.query(sql, function (err, result) {
      if (err) 
         throw err;
      console.log("floraData - record inserted");
    });
}


// function for updating device cache data to the most current and updated data about the device
var update_device_cache_data = (jsonObj, updateTime) =>{
  device_post_counter++;
    // check after 6sec if lastUpdateTime == updateTime then NO new POST requests from end point: device is off
    // else: device is on
    setTimeout(function(){
      if(lastUpdateTime.localeCompare(updateTime) == 0){
        set_device_status(jsonObj.GSTSerial, 0); // 0 - off
        console.log("device is offline");
      }
    },8000); // 8 sec

    // setting the lastUpdateTime to current updateTime
    lastUpdateTime = updateTime;

    var sql = `UPDATE device_cache_data
               SET log_time="${updateTime}",
               device_status=1,
               latitude="${jsonObj.latitude}",
               longitude="${jsonObj.longitude}",
               sats="${jsonObj.satellites}",
               pulse="${jsonObj.pulse}",
               battery="${jsonObj.battery}",
               gps_status="${jsonObj.gps_status}",
               bt_status="${jsonObj.bt_status}",
               gsm_status="${jsonObj.gsm_status}"
               WHERE device_sn=${jsonObj.GSTSerial};`;

    connection.query(sql, function (err, result) {
      if (err) 
         throw err;
      console.log("cache updated");
    });

    // if hour has passed -> insert record to device_location_history
    if(device_post_counter == 600){
      var sql = `INSERT INTO 
      device_location_history (log_time, latitude, longitude ,pulse) 
      VALUES ("${log_time}","${jsonObj.latitude}","${jsonObj.longitude}","${jsonObj.pulse}")
      WHERE device_sn = ${jsonObj.GSTSerial};`;
      connection.query(sql, function (err, result) {
        if (err) 
           throw err;
        console.log("location history record inserted");
      });
    }
}



// change device status off/on (0/1)
var set_device_status = (device_sn,deviceStatus)=>{
    var sql = `UPDATE cache_table SET device_status = ${deviceStatus} WHERE device_sn = ${device_sn}`;
    connection.query(sql, function (err, result) {
        if (err) 
           throw err;
        console.log("device status updated");
      });
}

// serving the latest data from device cache data
function get_user_data_from_cache(callback, device_sn){
  connection.query(`SELECT * FROM device_cache_data WHERE device_sn = ${device_sn}`, function (error, result, fields) {
      if (error){ 
          throw error;
      }
      return callback(error,result); // return callback function
    });
}

function get_user(callback,email, password){
  var sql = `SELECT * FROM app_users WHERE user_email = '${email}' AND user_pass = '${password}'`;

  connection.query(sql, function(error, result, fields){
    if(error){
      throw error;
    }
    return callback(error, result); // return callback function

  })
}

// fetching location history
function get_location_history(callback,device_sn, from_date, to_date){
  var sql = ` SELECT * 
             FROM device_location_history 
             WHERE device_sn = ${device_sn} 
             AND log_time >= ${from_date}
             AND log_time <= ${to_date}`

  connection.query(sql, function(error, result, fields){
    if(error){
      throw error;
    }
    return callback(error, result); // return callback function
  })
}


module.exports = {
    post_data_from_flora_device,
    get_user_data_from_cache,
    get_user,
    get_location_history
};
  