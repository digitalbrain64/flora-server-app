/* database POST functions module */

// fs module for file system functionality
const fs = require('fs');

// using npm mysql package for mysql db managment
const mysql = require('mysql');

// statistic functions module
const stat_functions = require('./statistics_functions.js');

// using mysql connection pool to manage connections and keep the connections to mysql db alive
var mysqlPool = mysql.createPool("mysql://bbf377481226a0:eaef03fd@us-cdbr-iron-east-02.cleardb.net/heroku_99593e22b69be93?reconnect=true");


// function gets the data from the GST device and monitors when the device gets offline
// function also passes the data from the GST device and a timestamp (current date and time) to a function that
// handles it and adds the data to devices_cache_data table
async function update_device_cache_data(jsonObj){
    var date = new Date(); // current datetime
    var log_time = date.toISOString().slice(0, 19).replace('T', ' '); // string that is excepted by mysql DATETIME format
    var currentUpdateTime = log_time;

    // if emergancy button has been pressed
    // create new record in sos_incidents table
    if(jsonObj.sos_status == 1){
      // check incident status: if there is already an incident from this device with status "open" of "handle" - dont add new incident
      // if there are incidents from this device with status "closed" or no incidents at all from this device - add new incident
      mysqlPool.query(`SELECT * FROM sos_incidents WHERE device_sn = ${jsonObj.GSTSerial} AND status="open" OR status="handle"`,function(err, result, fields){
        if(err) throw err;
        else{
          // if there is a new incidient and it is not a repeated insident from same device
          // add new incident
          if(result.length == 0){
            mysqlPool.query(`INSERT INTO sos_incidents(device_sn, latitude, longitude, pulse, time_log, status)
            VALUES(${jsonObj.GSTSerial}, "${jsonObj.latitude}", "${jsonObj.longitude}", ${jsonObj.pulse}, "${log_time}", "open");`, function(err, result, fields){
              if(err) throw err;
              else{
                /* ################ for local test - uncomment this part ################ */
                console.log(`device : ${jsonObj.GSTSerial} - emergancy!!`);
              }
            })
          }
        }
      })
    }
  
    // pass the update object and the time stamp to the function
    calcAvgSpeedAndUpdateCacheTable(jsonObj, log_time);  
  

    /* updating the last update time of the device inside ./util_files/devices_update_status.txt */
    // the goal is to store last update time for all connected devices
    // this way we can check if the device was disconnected or not
    // by comparing the update time in the file with the current time and 
    // if the difference is longer then 8 second - device is concidered as 'offline'
    await update_devices_status_file(jsonObj,currentUpdateTime);
  


  setTimeout(function(){
    // get the object with the same deviceId from ./util_files/devices_update_status.txt file
    // read from 'updateTime' file - get all content of the file
    fs.readFile('./database/database_files/util_files/devices_update_status.txt', 'utf8', function(err, data) {
      if (err) throw err;
      
      // parsing the data to JSON array - we know it's not empty because of previous actions
      // we know the json object with update time and device id is in the array
      var dataJsonArr = JSON.parse(data);
  
      // find the object by deviceId
      for(var i=0; i<dataJsonArr.length; i++){
        // if found the object
        if(dataJsonArr[i].deviceId == jsonObj.GSTSerial){
          // if compared to current time (past 8 sec) - no change - the device is considered offline
          if(dataJsonArr[i].lastUpdateTime.localeCompare(currentUpdateTime) == 0){
            // remove the object from the array
            dataJsonArr.splice(i, 1);
  
            // write to file - write the updated Json Array - overwrite the existing data of the txt file
            fs.writeFile('./database/database_files/util_files/updateTimeDevices.txt', JSON.stringify(dataJsonArr), function (err) {
              if (err) throw err;
            });
  
            set_device_status(jsonObj.GSTSerial, 0);
            console.log(`device id: ${jsonObj.GSTSerial} - offline`);
            // output in terminal - for debugging purposes
          }
        }
      }
    });
  },8000); // 8 sec
}


// adding new GST device user.
// checking if the user_id (teudat zehut) and device serial number are unique
// if - same serial number or teudat zehut was added before to some other device
// sends a message with details to the client about invalid infomration
// else - adding new user to device_users table, app_user_devices, device_cache_data
// the GST device will be assigned to the app user who send the request to add new device user
function post_add_new_dev_user(callback,devUserObj){

    // step 1: check if the ID and device_sn are unique
    mysqlPool.query(`SELECT * FROM device_users 
    WHERE device_sn=${devUserObj.device_sn}
    OR user_id = "${devUserObj.user_id}";`,
    function(errorSN, resSN, fields){
      if(errorSN){
        callback(errorSN, [{
          status : "error",
          message : errorSN
         }]);
      }
      else{
        // if length is NOT 0 then ID and serial number are NOT unique
        if(resSN.length != 0){
          return callback(errorSN, [{
            status: "error",
            message : "device with the same serial number/user ID is already registered"
          }]);
        }
        else{
          // STEP 2: add new record to device_users
          var sql1 = `INSERT INTO device_users(user_id,device_sn,first_name,last_name,phone_number_1,phone_number_2,address,weight,height,health_insurance)
          VALUES ("${devUserObj.user_id}",${devUserObj.device_sn},"${devUserObj.first_name}","${devUserObj.last_name}","${devUserObj.phone_num_1}","${devUserObj.phone_num_2}","${devUserObj.address}",${devUserObj.weight},${devUserObj.height},"${devUserObj.health_insurance}");`;
          // execute sql statemnt
          mysqlPool.query(sql1, function (err, devUserRows) {
            if (err) {
              return callback(err, devUserRows)
            }
            else{
              // STEP 3: add new record to app_user_devices
              var date= new Date();
              var current_date_time = date.toISOString().slice(0, 19).replace('T', ' ');
              var sql2 = `INSERT INTO app_user_devices(device_id, user_id, date_of_activation) VALUES (${devUserObj.device_sn}, ${devUserObj.app_user_id}, "${current_date_time}");`;
              mysqlPool.query(sql2, function (err, result) {
                if (err) {
                  return callback(err, result)
                }
                else{
                  // STEP 4: add new record to device_cache_data
                  // set all modules status to 0
                  // when device will be turned on = modules will change they're status according to new information from the device
                  var sql3 = `INSERT INTO devices_cache_data(device_sn, log_time, device_status, latitude, longitude, sats, pulse, battery, gps_status, bt_status, gsm_status, sos_status, distance, avg_speed)
                  VALUES(${devUserObj.device_sn}, "${current_date_time}", 0, "0", "0", 0,0,0,0,0,0,0, "0", "0");`
                  mysqlPool.query(sql3, function(error, res){
                    if(error){
                      return callback(error,res);
                    }
                    else{
                      // STEP 5: add new record to device_statistic table
                      // statistic data set to 0
                      // statistic data will be added to this row
                      var sql4 = `INSERT INTO device_statistic(device_sn, user_id, user_weight, user_age, avg_pulse, total_distance, avg_speed, steps_count, calories_burn, stats_start_time, minutes_since_stats_start)
                      VALUES(${devUserObj.device_sn}, ${devUserObj.user_id}, ${devUserObj.weight}, 0, 0, 0, 0, 0, 0,0,0);`
                      mysqlPool.query(sql4, function(error, res){
                        if(error){
                          return callback(error, res)
                        }
                        else{
                          callback(error, [{
                            status : "OK",
                            message : "device user added"
                          }])
                        }
                      })
                    }
                  })
                }
              });
            }
          });
        }
      }
    })
}


// change device status off/on (0/1)
// when the device status is changed to 0 - device statistic file from ./routes/database/database_files/devices_stats
// is cleared (content of file it removed)
// function also called another function to stop the statistic measurement for the device that has been disconnected
async function set_device_status(device_sn,deviceStatus){

    // clear the device stats file
    fs.writeFile(`./database/database_files/devices_stats/stats_device_${device_sn}.txt`,"", function(err, data){
      if (err) throw err;
    });
    
    // call function that stops the setInterval function for statistic measurement
    stat_functions.clearTimerInterval(device_sn);

    mysqlPool.query(`UPDATE device_statistic
    SET avg_pulse = 0,
    avg_speed = 0,
    steps_count = 0,
    calories_burn = 0,
    total_distance = 0,
    avg_pulse_daily = 0,
    stats_start_time = "0000-00-00",
    minutes_since_stats_start = 0
    WHERE device_sn = ${device_sn};`, function(err, result, fields){
      if(err) throw err;
      else{
        /* ################ for local test - uncomment this part ################ */
        console.log(`statistic for device: ${device_sn}  -  cleared`);
      }
    });
    
    // update the appropriate database table that the device has been disconnected
    var sql = `UPDATE devices_cache_data SET 
    device_status = ${deviceStatus},
    sos_status = 0
    WHERE device_sn = ${device_sn}`;
    mysqlPool.query(sql, function (err, result) {
        if (err) 
           throw err;
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
      var lat = result[0].latitude, lng = result[0].longitude;
      var pulse = result[0].pulse;
      var sql = `INSERT INTO 
        sos_incedents (device_sn ,log_time, employee_id, latitude, longitude ,pulse, amb_dispatched, sos_description) 
        VALUES (${reportObj.GSTSerial},"${report_log_time}","${lat}","${lng}",${pulse},${reportObj.amb}, "${reportObj.sos_description}");`;
        mysqlPool.query(sql, function (err, result) {
          if (err) 
             throw err;
             /* ################ for local test - uncomment this part ################ */
          
             //console.log(`device id: ${reportObj.GSTSerial} - sos report inserted`);
        });
    });
}

/* updating the last update time of the device inside /updateTimeDevices */
    // the goal is to store last update time about all connected devices
    // this way we can check if the device was disconnected or not
    // by comparing the update time in the file with the current time and 
    // if the difference is longer then 6 second - device has gone offline
function update_devices_status_file(jsonObj,currentUpdateTime){
  var data = fs.readFileSync('./database/database_files/util_files/devices_update_status.txt', 'utf8');

    var updateDeviceJsonArr;

    if(data == ""){
      updateDeviceJsonArr = [];

      var updateJsonTime = {
        deviceId:jsonObj.GSTSerial, // deviceId to identify the device
        lastUpdateTime:currentUpdateTime, // current time for comparing update times
        historyCounter:0// history counter to know when to add new record to deviceLocatioHistory MySql table
      }
      updateDeviceJsonArr.push(updateJsonTime);

      // write to file - parse the object to JSON object
      fs.writeFileSync('./database/database_files/util_files/devices_update_status.txt', JSON.stringify(updateDeviceJsonArr));
    }
    else{
      // parse to JsonArr and store in variable
      updateDeviceJsonArr = JSON.parse(data); // data is stored as JSON array
      var i;
      // for loop - find the object with the same deviceId
      for(i=0; i<updateDeviceJsonArr.length; i++){
        // if found
        if(updateDeviceJsonArr[i].deviceId == jsonObj.GSTSerial){
          // update the lastUpdateTime value
          updateDeviceJsonArr[i].lastUpdateTime = currentUpdateTime;
          updateDeviceJsonArr[i].historyCounter +=1

          /* insert record to device location history table */
          // new record is inserted every 5 (or more) minutes
          // historyCounter value is +1 every time the GST device sends new data
          // device send data every 3 seconds
          // we want to save a new history record every 5 min
          // 3sec*100histroyCounter = 5min
          if(updateDeviceJsonArr[i].historyCounter >= 100){
            // MySql command - inset into device_location_history table new record
            var sql = `INSERT INTO 
            devices_location_history (device_sn ,log_time, latitude, longitude ,pulse) 
            VALUES (${jsonObj.GSTSerial},"${currentUpdateTime}","${jsonObj.latitude}","${jsonObj.longitude}","${jsonObj.pulse}");`;

            // execute command
            mysqlPool.query(sql, function (err, result) {
              if (err) 
              throw err;
              // output to terminal for debugging purposes
              /* ################ for local test - uncomment this part ################ */
              console.log(`device id: ${jsonObj.GSTSerial} - location history record inserted`);
            });

            // update historyCounter for current device to 0
            updateDeviceJsonArr[i].historyCounter = 0;
        }

        break; // break - no need to loop any further
      }
    }
    // if object not found in the array - no JSON object with same deviceId - we must add new object
    if(i == updateDeviceJsonArr.length){
      // create new object
      var updateJsonTime = {
        deviceId:jsonObj.GSTSerial,
        lastUpdateTime:currentUpdateTime,
        historyCounter:0,
      }
      // push it to Json Array - using .push() as with any array in JS
      updateDeviceJsonArr.push(updateJsonTime);
    }

    // write to file - write the updated Json Array - overwrite the existing data of the txt file
    fs.writeFileSync('./database/database_files/util_files/devices_update_status.txt', JSON.stringify(updateDeviceJsonArr));
  }
}


/* utility functions - helper functions for data processing and devices managemnt */

// calculates average speed between two points on a map (lat,lng) and update the devices cache data table
async function calcAvgSpeedAndUpdateCacheTable(jsonObj, time_stamp){
    // get prevoius coordinates and device status
    mysqlPool.query(`SELECT * FROM devices_cache_data WHERE device_sn=${jsonObj.GSTSerial}`, function(err, result, fields){
      if(err)
        throw err;
      else{

        var distance = 0;
        var avgSpeedKmh = 0;
  
        // check if device was online the last time
        // if device was offline before - dont measure distance from the last location of the device

        // if device was online before - measure the distance from previus location to current location
        // also measure speed at which the device user passed the distance
        if(result[0].device_status){
          var curr_lat = jsonObj.latitude;
          var curr_lon = jsonObj.longitude;
          var curr_time_stamp = new Date(time_stamp);
    
          var prev_lat = result[0].latitude;
          var prev_lon = result[0].longitude;
          var prev_time_stamp = new Date(result[0].log_time);
        
          // distance will be retured in KM so we must get our time difference in Hours (not milliseconds or minutes)
          distance = getDistanceFromLatLonInKm(prev_lat, prev_lon, curr_lat, curr_lon);
    
    
          // time difference from last update (data from device) to current update (data from device)
          var timeDiffInMilliseconds = curr_time_stamp.getTime() - prev_time_stamp.getTime();
          
    
          // time difference in hours
          var timeDiffInHours = (timeDiffInMilliseconds/(1000*60*60))%24;
    
          // average speed between two locations
          avgSpeedKmh = distance/timeDiffInHours;
                              
          // add data for statistic measurements to the stat_device_{deviceId}.txt
          var data = fs.readFileSync(`./database/database_files/devices_stats/stats_device_${jsonObj.GSTSerial}.txt`);
    
            var deviceObj;
            if(data == ""){
              deviceObj = [];
            }
            else{
              deviceObj = JSON.parse(data);
            }
    
            try {
              // when pulse sensor on the device is not user - it sends 0
              // when we get pulst 0 or negative number - don't count this as a valid pulse measurement
              if(result[0].pulse > 0){
                deviceObj[0].pulse_counter+=1;
                deviceObj[0].total_pulse +=result[0].pulse;
              }
              deviceObj[0].update_counter +=1;
              deviceObj[0].distance +=distance;
              deviceObj[0].latitude = curr_lat;
              deviceObj[0].longitude = curr_lon;
              
              /* ################ for local test - uncomment this part ################ */
              console.log('@ [device: '+jsonObj.GSTSerial+'] ---- successful pulse measurements: '+deviceObj[0].pulse_counter+',   current pulse: '+result[0].pulse+'bpm,  total distance until now: '+parseFloat(deviceObj[0].distance).toFixed(3)+'km,   avg speed: '+avgSpeedKmh.toFixed(2)+'km/h,  time: '+timeDiffInMilliseconds+'milliseconds\n');

              fs.writeFileSync(`./database/database_files/devices_stats/stats_device_${deviceObj[0].device_id}.txt`, JSON.stringify(deviceObj));
              
            } catch (error) {
              set_device_status(result[0].device_sn, 0);
            }
        }
        // if device was offline before - start the start_stat function and pass the data object and time stamp to the function
        else{
          stat_functions.start_stat(jsonObj,time_stamp); 
          // function will create a statistic file in database_files/devices_stats and will start the statistic measurement function
        }
  
        // in any case (device was offline or online before) - update the device_cache_table to the newes data about the this device and mark the device as online (device_status=1)
        // apart from adding the data from the device , add average speed as well.
        // update device data in the devices_cache_data
        mysqlPool.query(`UPDATE devices_cache_data
        SET log_time="${time_stamp}",
        device_status=1,
        latitude="${jsonObj.latitude}",
        longitude="${jsonObj.longitude}",
        sats="${jsonObj.satellites}",
        pulse="${jsonObj.pulse}",
        battery="${jsonObj.battery}",
        gps_status="${jsonObj.gps_status}",
        bt_status="${jsonObj.bt_status}",
        gsm_status="${jsonObj.gsm_status}",
        sos_status=${jsonObj.sos_status},
        avg_speed="${avgSpeedKmh.toFixed(2)}",
        distance=${0}
        WHERE device_sn=${jsonObj.GSTSerial}`, function(err, result, fields){
          if(err)
            throw err;
        });
  
  
      }
    })
}
  
// calculates distance between two points on a map (lat, lng)
// returns the distance in km
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




// exports
module.exports = {
    post_sos_report,
    post_add_new_dev_user,
    update_device_cache_data,
};