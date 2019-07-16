/* database functionality module */
/* contains all neccesery database functions for internal use and export */

// using npm mysql package for mysql db managment
const mysql = require('mysql');

// connection to floraserverapp database
const connection = mysql.createConnection("mysql://bbf377481226a0:eaef03fd@us-cdbr-iron-east-02.cleardb.net/heroku_99593e22b69be93?reconnect=true");

// last update time will be changed dynamically
var lastUpdateTime;

// adding new user to users table
var add_user = (jsonObj)=>{
  var sql = `INSERT INTO users (user_id, user_firstName, user_lastName, user_device_sn) VALUES ("${jsonObj.userId}","${jsonObj.userFirstName}","${jsonObj.userLastName}","${jsonObj.userDeviceSN}");`;  
  connection.query(sql, function (err, result) {
    if (err) 
       throw err;
    console.log(sql+" - record inserted");
  });
}

// getting the data from flora device and inserting it flora_device_data table
var post_data_from_flora_device = (jsonObj) =>{
    var date = new Date();
    var log_time = `${date.getUTCDate()}-${date.getMonth()}-${date.getFullYear()}_${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
    var sql = `INSERT INTO flora_device_data (log_time,device_sn, latitude, longitude,satellites,pulse, battery, gps_status, bt_status, gsm_status) VALUES ("${log_time}","${jsonObj.GSTSerial}","${jsonObj.latitude}","${jsonObj.longitude}","${jsonObj.satellites}","${jsonObj.pulse}","${jsonObj.battery}%","${jsonObj.gps_status}","${jsonObj.bt_status}","${jsonObj.gsm_status}");`;  
    
    // updating cache_table
    update_user_cache_data(jsonObj, log_time);

    // sending to database
    connection.query(sql, function (err, result) {
      if (err) 
         throw err;
      console.log("floraData - record inserted");
    });
}


// function for updating user cache data = the most current and updated data about the device
var update_user_cache_data = (jsonObj, updateTime) =>{

    // check after 6sec if lastUpdateTime == updateTime then NO new POST requests from end point: device is off
    // else: device is on
    setTimeout(function(){
      if(lastUpdateTime.localeCompare(updateTime) == 0){
        set_device_status(jsonObj.GSTSerial, 0); // 0 - off
        console.log("device is offline");
      }
    },8000); // 6 sec

    // setting the lastUpdateTime to current updateTime
    lastUpdateTime = updateTime;

    var sql = `UPDATE cache_table
    SET   log_time="${updateTime}",
          device_status=1,
          latitude="${jsonObj.latitude}",
          longitude="${jsonObj.longitude}",
          satellites="${jsonObj.satellites}",
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
    
}



// change device status to off/on (0/1)
var set_device_status = (device_sn,deviceStatus)=>{
    var sql = `UPDATE cache_table SET device_status = ${deviceStatus} WHERE device_sn = ${device_sn}`;
    connection.query(sql, function (err, result) {
        if (err) 
           throw err;
        console.log("device status updated");
      });
}

// serving the updated data from cache table
function get_user_data_from_cache(callback, user_id){
  connection.query(`SELECT * FROM cache_table WHERE device_sn = 1`, function (error, result, fields) {
      if (error){ 
          throw error;
      }
      return callback(error,result); // return callback function
    });
}

function get_user(callback,email, password){
  var sql = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;

  connection.query(sql, function(error, result, fields){
    if(error){
      throw error;
    }
    return callback(error, result); // return callback function

  })
}


module.exports = {
    add_user,
    post_data_from_flora_device,
    get_user_data_from_cache,
    get_user
};
  