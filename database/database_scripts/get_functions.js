/* database GET functions module */

// using npm mysql package for mysql db managment
const mysql = require('mysql');


// request for http requests
const request = require('request');

// using mysql connection pool to manage connections and keep the connections to mysql db alive
var mysqlPool = mysql.createPool("mysql://bbf377481226a0:eaef03fd@us-cdbr-iron-east-02.cleardb.net/heroku_99593e22b69be93?reconnect=true");


// API key for openweathermap API
var openWeatherApiKey = "dd600a6f3524bad742db42efe5147d7e";



/* Device User Functions */

// function returns device user contacts
// useful in some cases
function get_user_contacts(callback, user_id){
    mysqlPool.query(`SELECT device_users_contact_relation.relation ,device_users_contacts.contact_first_name, device_users_contacts.contact_last_name, device_users_contacts.contact_address, device_users_contacts.contact_phone_number_1, device_users_contacts.contact_phone_number_2
    FROM device_users_contacts
    LEFT JOIN device_users_contact_relation
    ON device_users_contact_relation.contact_id=device_users_contacts.contact_id
    WHERE device_users_contact_relation.device_user_id = "${user_id}";`, function(err, result, fields){
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

// function that returns device user by user id OR if user id = 0 returns ALL device users
function get_device_users(callback, user_id){
    // check is user_id is 0
    if(user_id == 0){
        // query all device users
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
        // query specific device user by its id
      mysqlPool.query(`SELECT * FROM device_users WHERE user_id = "${user_id}"`, function(err, result, fields){
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

// get full information about the device user : user info, user contacts.
// search by device id
function get_device_user_full_data_by_device(callback, device_id){
    mysqlPool.query(`SELECT * FROM device_users WHERE device_sn = ${device_id}`, function(err, user_rows, fields){
      if(err){
        return callback(err, user_rows);
      }
      else{
        if(user_rows.length != 0){
            // an object that contains the result of the query
          var user_full_data = [user_rows[0]];
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
                    // add key to object - user phone book that contains all relations and contancts info
                  user_full_data[0].user_phone_book = result;
                  callback(err, user_full_data)
                }
                else{
                  user_full_data[0].user_phone_book = "no contacts";
                  callback(err, user_full_data);
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

// get full information about the device user : user info, user contacts.
// search by user id
function get_device_user_full_data_by_user(callback, user_id){
    mysqlPool.query(`SELECT * FROM device_users WHERE user_id = "${user_id}"`, function(err, user_rows, fields){
      if(err){
        return callback(err, user_rows);
      }
      else{
        if(user_rows.length != 0){
           // an object that contains the result of the query
           var user_full_data = [user_rows[0]];
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
              
                user_full_data[0].user_phone_book = result;
                callback(err, user_full_data)
              }
              else{
                user_full_data.user_phone_book = "no contacts";
                callback(err, user_full_data);
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





/* Other Functions */

// function returns highest pulse measurements - when was the highest pulse measurments by device id
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


// get weather data by latitude and longitude
// weather is provided by OpenWeatherMap API
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


// fetching location history from specific date to specific date
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





/* Application User Fuctions */

// get application user information
// useful for logins into applications or getting user data after user logged into application
function get_app_user_account(callback, user_id){
    mysqlPool.query(`SELECT * FROM app_users WHERE user_id = ${user_id}`,function(err, result, fields){
      if(err)
        throw err;
      else{
        callback(err, result);
      }
    })
}

// get information about GST devices assosicated to the app user
// every app user probably has some devices registered on his user account
// this function will fetch ONLY the devices that are registered on the specific application user account
function get_app_user_devices(callback, user_id){
    mysqlPool.query(`SELECT device_users.device_sn, device_users.first_name, device_users.last_name, device_users.phone_number_1, device_users.phone_number_2,device_users.address,app_user_devices.date_of_activation
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





/* Device Functions */

// serving the latest data from device cache data for a single device
// device updates include all information about the device modules and battery percentage
function get_device_updates(callback, device_sn){
    mysqlPool.query(`SELECT * FROM devices_cache_data WHERE device_sn = ${device_sn}`, function (error, result, fields) {
        if (error){ 
           return callback(error,result);
        }
        else{
          if(result.length == 0){
            callback(error, [{
              status : "error",
              message : `no data for device_id : ${device_sn}`
            }])
          }
          else{
            callback(error,result);
          }
        }
    });
}

// multi-functional solution
// flag indicated what devices to get : 'all' = fetch all devices, 'online' = fetch only devices that are online now
// user id = user with priviliges will get all devices (all avalibale)
// user with less priviliges will get ONLY the devices that are registered to his account
function get_all_devices_updates(callback ,flag, app_user_id){
  // check if user has privileges
  mysqlPool.query(`SELECT * FROM app_users WHERE user_id = ${app_user_id}`, function(err, res, fields){
    if(err){
      callback(err, res);
    }
    else{
      if(res.length != 0){
        // if user priviliges = 5 user has privileges for this action
        if(res[0].user_priv == 5){
          // all-online flag - return all online devices
          if(flag == "online"){
            mysqlPool.query(`SELECT devices_cache_data.device_sn ,devices_cache_data.log_time, devices_cache_data.device_status, devices_cache_data.latitude, devices_cache_data.longitude, devices_cache_data.sats, devices_cache_data.pulse,devices_cache_data.battery,devices_cache_data.gps_status,devices_cache_data.bt_status,devices_cache_data.gsm_status, devices_cache_data.sos_status, devices_cache_data.distance, devices_cache_data.avg_speed,device_users.user_id, device_users.first_name, device_users.last_name,device_users.phone_number_1,device_users.phone_number_2
            FROM devices_cache_data
            LEFT JOIN device_users
            ON device_users.device_sn=devices_cache_data.device_sn
            WHERE devices_cache_data.device_status = 1;`, function (error, result, fields) {
              if (error){ 
                return callback(error,result);
              }
              else{
                return callback(error,result);
              }
            });
          }
          // all flag - return all devices
          else{
            mysqlPool.query(`SELECT devices_cache_data.device_sn ,devices_cache_data.log_time, devices_cache_data.device_status, devices_cache_data.latitude, devices_cache_data.longitude, devices_cache_data.sats, devices_cache_data.pulse,devices_cache_data.battery,devices_cache_data.gps_status,devices_cache_data.bt_status,devices_cache_data.gsm_status, devices_cache_data.sos_status, devices_cache_data.distance, devices_cache_data.avg_speed,device_users.user_id, device_users.first_name, device_users.last_name,device_users.phone_number_1,device_users.phone_number_2
            FROM devices_cache_data
            LEFT JOIN device_users
            ON device_users.device_sn=devices_cache_data.device_sn;`, function (error, result, fields) {
              if (error){ 
                return callback(error,result);
              }
              else{
                return callback(error,result);
              }
            });
          }
        }
        // if user priviliges = 1 regular app user has limited privileges
        // will get only the devices that are registered on his account
        else if (res[0].user_priv == 1){
          // all-online flag - return all online devices
          if(flag == "online"){
            mysqlPool.query(`SELECT devices_cache_data.device_sn ,devices_cache_data.log_time, devices_cache_data.device_status, devices_cache_data.latitude, devices_cache_data.longitude, devices_cache_data.sats, devices_cache_data.pulse,devices_cache_data.battery,devices_cache_data.gps_status,devices_cache_data.bt_status,devices_cache_data.gsm_status, devices_cache_data.sos_status, devices_cache_data.distance, devices_cache_data.avg_speed
            FROM devices_cache_data
            LEFT JOIN app_user_devices
            ON app_user_devices.device_id = devices_cache_data.device_sn
            WHERE app_user_devices.user_id = ${app_user_id} AND devices_cache_data.device_status=1;`, function (error, result, fields) {
              if (error){ 
                return callback(error,result);
              }
              else{
                return callback(error,result);
              }
            });
          }
          // all flag - return all devices
          else{
            mysqlPool.query(`SELECT devices_cache_data.device_sn ,devices_cache_data.log_time, devices_cache_data.device_status, devices_cache_data.latitude, devices_cache_data.longitude, devices_cache_data.sats, devices_cache_data.pulse,devices_cache_data.battery,devices_cache_data.gps_status,devices_cache_data.bt_status,devices_cache_data.gsm_status, devices_cache_data.sos_status, devices_cache_data.distance, devices_cache_data.avg_speed
            FROM devices_cache_data
            LEFT JOIN app_user_devices
            ON app_user_devices.device_id = devices_cache_data.device_sn
            WHERE app_user_devices.user_id = ${app_user_id};`, function (error, result, fields) {
              if (error){ 
                return callback(error,result);
              }
              else{
                return callback(error,result);
              }
            });
          }
        }
      }
      else{
        callback(err, [{
          status: "error",
          message: `user with id: ${app_user_id} -- not found`
        }])
      }
    }
  });
}

// get statistic for single device by device id
function get_device_statistics(callback, device_sn){
  mysqlPool.query(`SELECT * FROM device_statistic WHERE device_sn = ${device_sn}`, function(err, result, fields){
    if(err){
      return callback(err, result);
    }
    else{
      callback(err, result);
    }
  })
}

function get_all_devices_statistics(callback, app_user_id){
  mysqlPool.query(`SELECT * FROM app_users WHERE user_id = ${app_user_id}`, function(err, res, fields){
    if(err){
      return callback(err, res);
    }
    else{
      if(res.length != 0){
        // if user priviliges = 5 user has privileges for this action
        if(res[0].user_priv == 5){
          // all-online flag - return all online devices
          mysqlPool.query(`SELECT * FROM device_statistic;`, function (error, result, fields) {
            if (error){ 
              return callback(error,result);
            }
            else{
              callback(error,result);
            }
          });
        }
        else if(res[0].user_priv == 1){
          mysqlPool.query(`SELECT * FROM device_statistic
          LEFT JOIN app_user_devices
          ON app_user_devices.device_id = device_statistic.device_sn
          WHERE app_user_devices.user_id = ${app_user_id};`, function (error, result, fields) {
            if (error){ 
              return callback(error,result);
            }
            else{
              callback(error,result);
            }
          });
        }
          // all flag - return all devices
          else{
            mysqlPool.query(`SELECT devices_cache_data.device_sn ,devices_cache_data.log_time, devices_cache_data.device_status, devices_cache_data.latitude, devices_cache_data.longitude, devices_cache_data.sats, devices_cache_data.pulse,devices_cache_data.battery,devices_cache_data.gps_status,devices_cache_data.bt_status,devices_cache_data.gsm_status, devices_cache_data.sos_status, devices_cache_data.distance, devices_cache_data.avg_speed,device_users.user_id, device_users.first_name, device_users.last_name,device_users.phone_number_1,device_users.phone_number_2
            FROM devices_cache_data
            LEFT JOIN device_users
            ON device_users.device_sn=devices_cache_data.device_sn;`, function (error, result, fields) {
              if (error){ 
                return callback(error,result);
              }
              else{
                callback(error,result);
              }
            });
          }
        }
        else{
          callback(err, [{
            status: "error",
            message: `user with id: ${app_user_id} -- not found`
          }])
        }
      }
  });
}


function get_sos_reports(callback, app_user_id){
  mysqlPool.query(`SELECT * FROM app_users WHERE user_id = ${app_user_id}`, function(err, res, fields){
    if(err){
      return callback(err, res);
    }
    else{
      if(res.length != 0){
        // if user priviliges = 5 user has privileges for this action
        if(res[0].user_priv == 5){
          mysqlPool.query(`SELECT * FROM sos_reports;`, function(err, res, fields){
            if(err){
              return callback(err, res);
            }
            else{
              callback(err, res);
            }
          });
        }
        else{
          callback(err, [{
            status:"error",
            message: "user has no privileges for this action"
          }])
        }
      }
    }
  });
  
}



module.exports = {
    get_highest_pulse,
    get_lowest_pulse,
    user_login,
    get_weather_update,
    get_device_updates,
    get_app_user_account,
    get_location_history,
    get_device_user_full_data_by_user,
    get_device_user_full_data_by_device,
    get_device_users,
    get_user_contacts,
    get_app_user_devices,
    get_all_devices_updates,
    get_device_statistics,
    get_all_devices_statistics,
    get_sos_reports
  };
  
  