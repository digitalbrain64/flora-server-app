// /* database functionality module */
// /* contains all neccesery database functions for internal use and export */
// const fs = require('fs');

// // using npm mysql package for mysql db managment
// const mysql = require('mysql');

// // Nexmo API for SMS messages
// const Nexmo = require('nexmo');

// const stat_functions = require('./database_scripts/statistics_functions.js/index.js');

// // request for http requests
// const request = require('request');

// // using mysql connection pool to manage connections and keep the connections to mysql db alive
// var mysqlPool = mysql.createPool("mysql://bbf377481226a0:eaef03fd@us-cdbr-iron-east-02.cleardb.net/heroku_99593e22b69be93?reconnect=true");

// var log_time;

// // API key for openweathermap API
// var openWeatherApiKey = "dd600a6f3524bad742db42efe5147d7e";

// /*
// // handle gps module incorrect latitude/longitude data
// function check_location_fix(current_latlng){

//   // if the difference in latitude or longitude is more then 0.0014 from the previous data then try other resources for fetching location
//   if((Math.abs(current_latlng.lat - prev_latlng.lat) > 0.0014 || Math.abs(current_latlng.lng - prev_latlng.lng) > 0.0014)){
    
//     var url = `${ipLocationApi}${currentIP}?${ipLocationApiAccessKey}`;
    
//     // try get location from IP location api (ipstack api)
//     request(url, (error, response, body)=> {
//       // in case of success = change the lat and lng in current_latlng
//       // assign current_latlng.source to 'api'
//       if (!error && response.statusCode === 200) {
//         const apiResponse = JSON.parse(body)
//         //console.log(`lat from api: ${apiResponse.latitude}\n lng from api: ${apiResponse.latitude}`);
//         current_latlng.lat = apiResponse.latitude;
//         current_latlng.lng = apiResponse.longitude;
//         current_latlng.source = 'api';
//         console.log("location from api");
//       } 
//       else {
//         // unsuccessful fetching from api = assign 0 lat and 0 lng to current_latlng
//         // assign current_latlng to 'none'
//         current_latlng.lat = '00.00000';
//         current_latlng.lng = '00.00000';
//         current_latlng.source = 'none';
//         console.log("location from none");
        
//         //console.log("Got an error: ", error, ", status code: ", response.statusCode)
//       }

//     })
//   }
//   else{
//     console.log("location from gps");
//     current_latlng.source = "gps";
//     prev_latlng = current_latlng;
    
//   }
//   console.log(`\ncurrent_latlng: ${current_latlng.lat}, ${current_latlng.lng}\nprev_latlng: ${prev_latlng.lat}, ${prev_latlng.lng}\n`);

//   return current_latlng;
// }
// */
// // // function for updating device cache data to the most current and updated data about the device
// // function update_device_cache_data(jsonObj){
// //   var date = new Date();
// //   log_time = date.toISOString().slice(0, 19).replace('T', ' ');
// //   var currentUpdateTime = log_time;

// //   calcAvgSpeedAndUpdateCacheTable(jsonObj, log_time);

// //   console.log(jsonObj.pulse);


// //   /* updating the last update time of the device inside /updateTimeDevices */
// //   // the goal is to store last update time about all connected devices
// //   // this way we can check if the device was disconnected or not
// //   // by comparing the update time in the file with the current time and 
// //   // if the difference is longer then 6 second - device has gone offline

// //   // read from 'updateTime' file - get all content of the file
// //   fs.readFile('./updateTimeDevices.txt', 'utf8', function(err, data) {
// //     if (err) throw err;

// //     var updateDeviceJsonArr;

// //     if(data == ""){
// //       updateDeviceJsonArr = [];
// //       var updateJsonTime = {
// //         deviceId:jsonObj.GSTSerial, // deviceId to identify the device
// //         lastUpdateTime:currentUpdateTime, // current time for comparing update times
// //         historyCounter:0 // history counter to know when to add new record to deviceLocatioHistory MySql table
// //       }
// //       updateDeviceJsonArr.push(updateJsonTime);

// //       // write to file - parse the object to JSON object
// //       fs.writeFile('./updateTimeDevices.txt', JSON.stringify(updateDeviceJsonArr), function (err) {
// //         if (err) throw err;
// //       });
// //     }
// //     else{
// //       // parse to JsonArr and store in variable
// //       updateDeviceJsonArr = JSON.parse(data); // data is stored as JSON array
// //       var i;
// //       // for loop - find the object with the same deviceId
// //       for(i=0; i<updateDeviceJsonArr.length; i++){
// //         // if found
// //         if(updateDeviceJsonArr[i].deviceId == jsonObj.GSTSerial){
// //           // update the lastUpdateTime value
// //           updateDeviceJsonArr[i].lastUpdateTime = currentUpdateTime;
// //           updateDeviceJsonArr[i].historyCounter = updateDeviceJsonArr[i].historyCounter+1

// //           /* insert record to device location history table */
// //           // new record is inserted every 5 (or more) minutes
// //           // historyCounter value is +1 every time the GST device sends new data
// //           // device send data every 3 seconds
// //           // we want to save a new history record every 5 min
// //           // 3sec*100histroyCounter = 5min
// //           if(updateDeviceJsonArr[i].historyCounter >= 100){
// //             // MySql command - inset into device_location_history table new record
// //             var sql = `INSERT INTO 
// //             devices_location_history (device_sn ,log_time, latitude, longitude ,pulse) 
// //             VALUES (${jsonObj.GSTSerial},"${log_time}","${jsonObj.latitude}","${jsonObj.longitude}","${jsonObj.pulse}");`;

// //             // execute command
// //             mysqlPool.query(sql, function (err, result) {
// //               if (err) 
// //               throw err;
// //               // output to terminal for debugging purposes
// //               console.log(`device id: ${jsonObj.GSTSerial} - location history record inserted`);
// //             });

// //             // update historyCounter for current device to 0
// //             updateDeviceJsonArr[i].historyCounter = 0;
// //         }
// //         break; // break - no need to loop any further
// //       }
// //     }
// //     // if object not found in the array - no JSON object with same deviceId - we must add new object
// //     if(i == updateDeviceJsonArr.length){
// //       // create new object
// //       var updateJsonTime = {
// //         deviceId:jsonObj.GSTSerial,
// //         lastUpdateTime:currentUpdateTime,
// //         historyCounter:0
// //       }
// //       // push it to Json Array - using .push() as with any array in JS
// //       updateDeviceJsonArr.push(updateJsonTime);
// //     }

// //     // write to file - write the updated Json Array - overwrite the existing data of the txt file
// //     fs.writeFile('./updateTimeDevices.txt', JSON.stringify(updateDeviceJsonArr), function (err) {
// //       if (err) throw err;
// //     });
// //   }
// // });


// // // async setTimeOut will chack each 8 seconds if devices gone offline
// // // by comparing the updateTimeDevice.txt json objects with current time

// // setTimeout(function(){
// //   // get the object with the same deviceId from updateTimeDevices.txt file
// //   // read from 'updateTime' file - get all content of the file
// //   fs.readFile('./updateTimeDevices.txt', 'utf8', function(err, data) {
// //     if (err) throw err;
    
// //     // parsing the data to JSON array - we know it's not empty because of previous actions
// //     // we know the json object with update time and device id is in the array
// //     var dataJsonArr = JSON.parse(data);

// //     // find the object by deviceId
// //     for(var i=0; i<dataJsonArr.length; i++){
// //       // if found the object
// //       if(dataJsonArr[i].deviceId == jsonObj.GSTSerial){
// //         // if compared to current time (past 8 sec) - no change - the device is considered offline
// //         if(dataJsonArr[i].lastUpdateTime.localeCompare(currentUpdateTime) == 0){
// //           // remove the object from the array
// //           dataJsonArr.splice(i, 1);

// //           // write to file - write the updated Json Array - overwrite the existing data of the txt file
// //           fs.writeFile('./updateTimeDevices.txt', JSON.stringify(dataJsonArr), function (err) {
// //             if (err) throw err;
// //             console.log('Saved!');
// //           });

// //           set_device_status(jsonObj.GSTSerial, 0);
// //           console.log(`device id: ${jsonObj.GSTSerial} - offline`);
// //           // output in terminal - for debugging purposes
// //         }
// //       }
// //     }
// //   });
// // },8000); // 8 sec
// // }

// // // serving the latest data from device cache data
// // function get_device_updates(callback, device_sn){
// //   mysqlPool.query(`SELECT * FROM devices_cache_data WHERE device_sn = ${device_sn}`, function (error, result, fields) {
// //       if (error){ 
// //          return callback(error,result);
// //       }
// //       else{
// //         if(result.length == 0){
// //           callback(error, [{
// //             status : "error",
// //             message : `no cache data for device_id : ${device_sn}`
// //           }])
// //         }
// //         else{
// //           callback(error,result);
// //         }
// //       }
// //   });
// // }

// // // get information about GST devices assosicated to the app user
// // function get_app_user_devices(callback, user_id){
// //   mysqlPool.query(`SELECT device_users.device_sn, device_users.first_name, device_users.last_name, device_users.phone_number_1, device_users.phone_number_2,device_users.address,app_user_devices.date_of_activation
// //   FROM app_user_devices
// //   LEFT JOIN device_users
// //   ON app_user_devices.device_id = device_users.device_sn
// //   WHERE app_user_devices.user_id = ${user_id};`, function(err, result, fields){
// //     if(err)
// //       return callback(err, result);
// //     else{
// //       if(result.length == 0){
// //         callback(err, [{
// //           status:"error",
// //           message: `no GST devices registered with user id ${user_id}`
// //         }])
// //       }
// //       else{
// //         callback(err, result);
// //       }
// //     }
// //   })
// // }

// // // fetching app user information
// // function user_login(callback, credentials, password){
// //   var sql = "";

// //   if(credentials.includes("@"))
// //     // search by email
// //     sql = `SELECT * FROM app_users WHERE user_email = '${credentials}' AND user_pass = '${password}'`;
// //   else
// //     // search by username
// //     sql = `SELECT * FROM app_users WHERE user_name = '${credentials}' AND user_pass = '${password}'`;
  
// //     mysqlPool.query(sql, function(error, result, fields){
// //     if(error){
// //       return callback(error, result);
// //     }
// //     else{
// //       if(result.length == 0){
// //           callback(error, [{
// //           status : "error",
// //           message : "user not found"
// //         }])
// //       }
// //       else{
// //           callback(error, result); 
// //       }
// //     }
// //   })
// // }

// // function get_app_user_account(callback, user_id){
// //   mysqlPool.query(`SELECT * FROM app_users WHERE user_id = ${user_id}`,function(err, result, fields){
// //     if(err)
// //       throw err;
// //     else{
// //       callback(err, result);
// //     }
// //   })
// // }

// // // fetching location history
// // function get_location_history(callback,device_sn, from_date, to_date){
// //   var sql = `SELECT * FROM devices_location_history WHERE device_sn = ${device_sn} AND log_time >= '${from_date}' AND log_time <= '${to_date}'`
// //   mysqlPool.query(sql, function(error, result, fields){
// //     if(error){
// //       return callback(error, result);
// //     }
// //     else{
// //       if(result.length == 0){
// //         callback(error,[{
// //           status : "error",
// //           message : `no history records - device_id : ${device_sn}, from date: ${from_date}, to date: ${to_date}`
// //         }]);
// //       }
// //       else{
// //         callback(error, result);
// //       }
// //     }  
// //   });
// // }

// // function get_weather_update(callback,lat,lng){
// //   var url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${openWeatherApiKey}`;
// //   request(url, (error, response, body)=>{
// //     if(!error && response.statusCode === 200){
// //         callback(error, body);
// //     }
// //     else
// //         callback(error, [{
// //           status : "error",
// //           message : JSON.parse(body).message
// //         }])
// //   });
// // }

// // function post_sos_report(reportObj){
// //   var report_date = new Date();
// //   var report_log_time = report_date.toISOString().slice(0, 19).replace('T', ' ');
// //   // get current lat lng from cache by device_sn
// //   mysqlPool.query(`SELECT * FROM devices_cache_data WHERE device_sn = ${device_sn}`, function (error, result, fields) {
// //     if (error){ 
// //         return callback(error, result);
// //     }
// //     var lat = result.latitude, lng = result.longitude;
// //     var pulse = result.pulse;
// //     var sql = `INSERT INTO 
// //       sos_reports (device_sn ,log_time, employee_id, latitude, longitude ,pulse, amb_dispatched, sos_description, relatives_alerted) 
// //       VALUES (${reportObj.GSTSerial},"${report_log_time}","${lat}","${lng}",${pulse},${reportObj.amb}, "${reportObj.sos_description}", ${reportObj.relatives_alerted});`;
// //       mysqlPool.query(sql, function (err, result) {
// //         if (err) 
// //            throw err;
// //         console.log(`device id: ${reportObj.GSTSerial} - sos report inserted`);
// //       });
// //   });
// // }

// // // step 1
// // function send_pass_restore_code(callback,credentials){
// //   var sql = "";
// //     // search by email
// //     if(credentials.includes('@')){
// //       sql = `SELECT * FROM app_users WHERE user_email = '${credentials}';`;
// //     }
// //     else{
// //       sql = `SELECT * FROM app_users WHERE user_name = '${credentials}';`;
// //     }
// //     mysqlPool.query(sql, function(error, result, fields){
// //       if(error){
// //         return callback(error, result);
// //       }
// //       else{
// //         if(result.length != 0){
// //           const nexmo = new Nexmo({
// //             apiKey: 'b7fc2c52',
// //             apiSecret: 'AjqYtGILiudrl0m9',
// //           });
  
// //           const opts = {
// //             "type": "unicode"
// //           }
// //           const from = 'GST';
// //           const to = result[0].user_contact_number;
// //           var min = Math.ceil(1000);
// //           var max = Math.floor(9999);
// //           const code = Math.floor(Math.random() * (max - min)) + min;
// //           const text = `your validation code is: ${code}`;
  
// //           //mysqlPool.query(`UPDATE app_users SET restore_code = '${code}' WHERE user_email = '${credentials}' OR user_name = '${credentials}'`)
  
// //           nexmo.message.sendSms(from, to, text,opts, (err, responseData) => {
// //             if (err) {
// //                 console.log(err);
// //             } else {
// //                 if(responseData.messages[0]['status'] === "0") {
// //                     console.log("Message sent successfully.");
// //                 } else {
// //                     console.log(`Message failed with error: ${responseData.messages[0]['error-text']}`);
// //                 } 
// //             }
// //           })
// //           mysqlPool.query(`UPDATE app_users SET restore_code = '${code}' WHERE user_email = '${credentials}' OR user_name = '${credentials}'`, (err, result, fields)=>{
// //             if(err)
// //               throw err;
// //           })

// //           callback(error, [{
// //             status : "OK",
// //             message: "SMS with restore code has been sent",
// //             phone_number : result[0].user_contact_number,
// //             email : result[0].user_email
// //           }]);
// //         }
// //         else{
// //           callback(error, [{
// //             status : "error",
// //             message: `user with credentials ${credentials} not found`,
// //           }])
// //         }
// //       }
// //   })
// // }

// // // step 2
// // function check_restore_code(callback,email,res_code){
// //   mysqlPool.query(`SELECT * FROM app_users WHERE user_email = '${email}' AND restore_code = '${res_code}'`, (err, result, fields)=>{
// //     if(err)
// //       return callback(error, result);
// //     else{
// //       if(result.length == 0){
// //         callback(err, [{
// //           status : "error",
// //           message : "no user found/restore code not correct"
// //         }]);
// //       }
// //       else{
// //         callback(err, [{
// //           status : "OK",
// //           message :"validation successful",
// //           email : result[0].user_email
// //         }]);
// //       }
// //     }
// //   })
// // }

// // // step 3
// // function change_user_pass(callback,email,new_pass){
// //   mysqlPool.query(`UPDATE app_users SET 
// //   user_pass = '${new_pass}',
// //   restore_code = NULL
// //   WHERE user_email = '${email}'`, (err, result, fields)=>{
// //     if(err)
// //       return callback(err, result);
// //     else{
// //       if(result.affectedRows == 0){
// //         callback(err, [{
// //           status : "error",
// //           message : "user email not currect - password not changed"
// //         }])
// //       }
// //       else{
// //         callback(err, [{
// //           status : "OK",
// //           message : "password changed"
// //         }])
// //       }
// //     }
// //   })
// // }

// // // function returns highest pulse measurements
// // function get_highest_pulse(callback, device_id){
// //   mysqlPool.query(`SELECT log_time, latitude, longitude, pulse
// //   FROM devices_realtime_data
// //   WHERE pulse = (SELECT MAX(pulse) FROM flora_device_data) AND device_sn=${device_id}`, function(error, results, fields){
// //     if(error)
// //        return callback(error, results);
// //     else{
// //       if(results.length == 0){
// //         callback(error, [{
// //           status : "error",
// //           message : `no data for device id : ${device_id}`
// //         }]);
// //       }
// //       else{
// //         callback(error , results);
// //       }
// //     }
// //   })
// // }

// // // function returns lowest pulse measurements
// // function get_lowest_pulse(callback, device_id){
// //   mysqlPool.query(`SELECT log_time, latitude, longitude, pulse
// //   FROM devices_realtime_data
// //   WHERE pulse = (SELECT MIN(pulse) FROM flora_device_data) AND device_sn=${device_id}`, function(error, results, fields){
// //     if(error)
// //        return callback(error, results);
// //     else{
// //       if(results.length == 0){
// //         callback(error, [{
// //           status : "error",
// //           message : `no data for device id : ${device_id}`
// //         }])
// //       }
// //       else{
// //         callback(error , results);
// //       }
// //     }
// //   })
// // }

// // function get_device_users(callback, user_id){
// //   if(user_id == 0){
// //     mysqlPool.query(`SELECT * FROM device_users`, function(err, results, fields){
// //       if(err){
// //         return callback(err, results);
// //       }
// //       else{
// //         callback(err, results);
// //       }
// //     });
// //   }
// //   else{
// //     mysqlPool.query(`SELECT * FROM device_users WHERE user_id = "${user_id}"`, function(err, result, fields){
// //       if(err){
// //         return callback(err, result);
// //       }
// //       else{
// //         if(result.length != 0){
// //           callback ( err, result)
// //         }
// //         else{
// //           callback ( err, [{
// //             status:"error",
// //             message : "user not found"
// //           }])
// //         }
// //       }
// //     });
// //   }
// // }

// // function get_device_user_full_data_by_user(callback, user_id){
// //   mysqlPool.query(`SELECT * FROM device_users WHERE user_id = "${user_id}"`, function(err, user_rows, fields){
// //     if(err){
// //       return callback(err, user_rows);
// //     }
// //     else{
// //       if(user_rows.length != 0){
// //         var user_full_data = {
// //           user_id: user_rows[0].user_id,
// //           user_first_name:user_rows[0].first_name,
// //           user_last_name: user_rows[0].last_name,
// //           user_address: user_rows[0].address,
// //           user_phone_number_1:user_rows[0].phone_number_1,
// //           user_phone_number_2:user_rows[0].phone_number_2,
// //         }
// //         mysqlPool.query(`SELECT device_users_contact_relation.relation ,device_users_contacts.contact_first_name, device_users_contacts.contact_last_name, device_users_contacts.contact_address, device_users_contacts.contact_phone_number_1, device_users_contacts.contact_phone_number_2
// //         FROM device_users_contacts
// //         LEFT JOIN device_users_contact_relation
// //         ON device_users_contact_relation.contact_id=device_users_contacts.contact_id
// //         WHERE device_users_contact_relation.device_user_id = ${user_rows[0].user_id};`, function(err, result, fields){
// //           if(err){
// //             return callback(err, result);
// //           }
// //           else{
// //             if(result.length!=0){
            
// //               user_full_data.user_phone_book = result;
// //               callback(err, [user_full_data])
// //             }
// //             else{
// //               user_full_data.user_phone_book = "no contacts";
// //               callback(err, [user_full_data]);
// //             }
// //           }
// //         })
// //       }
// //       else{
// //         callback(err, [{
// //           status: "error",
// //           message : "user not found"
// //         }])
// //       }
// //     }
// //   })
  
// // }

// // function get_device_user_full_data_by_device(callback, device_id){
// //   mysqlPool.query(`SELECT * FROM device_users WHERE device_sn = ${device_id}`, function(err, user_rows, fields){
// //     if(err){
// //       return callback(err, user_rows);
// //     }
// //     else{
// //       if(user_rows.length != 0){
// //         var user_full_data = {
// //           user_id: user_rows[0].user_id,
// //           user_first_name:user_rows[0].first_name,
// //           user_last_name: user_rows[0].last_name,
// //           user_address: user_rows[0].address,
// //           user_phone_number_1:user_rows[0].phone_number_1,
// //           user_phone_number_2:user_rows[0].phone_number_2,
// //         }
// //         mysqlPool.query(`SELECT device_users_contact_relation.relation ,device_users_contacts.contact_first_name, device_users_contacts.contact_last_name, device_users_contacts.contact_address, device_users_contacts.contact_phone_number_1, device_users_contacts.contact_phone_number_2
// //           FROM device_users_contacts
// //           LEFT JOIN device_users_contact_relation
// //           ON device_users_contact_relation.contact_id=device_users_contacts.contact_id
// //           WHERE device_users_contact_relation.device_user_id = ${user_rows[0].user_id};`, function(err, result, fields){
// //             if(err){
// //               return callback(err, result);
// //             }
// //             else{
// //               if(result.length!=0){
// //                 user_full_data.user_phone_book = result;
// //                 callback(err, [user_full_data])
// //               }
// //               else{
// //                 user_full_data.user_phone_book = "no contacts";
// //                 callback(err, [user_full_data]);
// //               }
// //             }
// //           })
// //       }
// //       else{
// //         callback(err, [{
// //           status: "error",
// //           message : "user not found"
// //         }])
// //       }
// //     }
// //   })
  
// // }

// // function get_user_contacts(callback, user_id){
// //   mysqlPool.query(`SELECT device_users_contact_relation.relation ,device_users_contacts.contact_first_name, device_users_contacts.contact_last_name, device_users_contacts.contact_address, device_users_contacts.contact_phone_number_1, device_users_contacts.contact_phone_number_2
// //   FROM device_users_contacts
// //   LEFT JOIN device_users_contact_relation
// //   ON device_users_contact_relation.contact_id=device_users_contacts.contact_id
// //   WHERE device_users_contact_relation.device_user_id = "${user_id}";`, function(err, result, fields){
// //     if(err){
// //       return callback(err, result);
// //     }
// //     else{
// //       if(result.length == 0){
// //         callback(err, [{
// //           status : "error",
// //           message : `no contacts for user ${user_id}`
// //         }])
// //       }
// //       else{
// //         callback(err,result);
// //       }
// //     }
// //   });
// // }

// // // change device status off/on (0/1)
// // let set_device_status = (device_sn,deviceStatus)=>{

// //     fs.writeFile(`./routes/database/database_files/devices_stats/stats_device_${device_sn}.txt`,"", function(err, data){
// //       if (err) throw err;
// //     });
// //     stat_functions.clearTimerInterval(device_sn);
// //     var sql = `UPDATE devices_cache_data SET device_status = ${deviceStatus}
// //     WHERE device_sn = ${device_sn}`;
// //     mysqlPool.query(sql, function (err, result) {
// //         if (err) 
// //            throw err;
// //     });
// // }

// // // calculates average speed between two points on a map (lat,lng)
// // let calcAvgSpeedAndUpdateCacheTable = (jsonObj, time_stamp)=>{
// //   // get prevoius coordinates
// //   mysqlPool.query(`SELECT * FROM devices_cache_data WHERE device_sn=${jsonObj.GSTSerial}`, function(err, result, fields){
// //     if(err)
// //       throw err;
// //     else{
// //       var distance = 0;
// //       var avgSpeedKmh = 0;
// //       var newDistance = 0;
// //       var update_counter = 0;

// //       // check if device was online the last time
// //       // if device was offline - dont measure distance from the last location of the device
// //       if(result[0].device_status){
// //         var curr_lat = jsonObj.latitude;
// //         var curr_lon = jsonObj.longitude;
// //         var curr_time_stamp = new Date(time_stamp);
  
// //         var prev_lat = result[0].latitude;
// //         var prev_lon = result[0].longitude;
// //         var prev_time_stamp = new Date(result[0].log_time);
  
// //         var prev_distance = result[0].distance;
  
// //         // distance will be retured in KM so we must get our time difference in Hours (not milliseconds or minutes)
// //         distance = getDistanceFromLatLonInKm(prev_lat, prev_lon, curr_lat, curr_lon);
  
  
// //         var timeDiffInMilliseconds = curr_time_stamp.getTime() - prev_time_stamp.getTime();
        
  
// //         // time difference in hours
// //         var timeDiffInHours = (timeDiffInMilliseconds/(1000*60*60))%24;
  
// //         avgSpeedKmh = distance/timeDiffInHours;
        
  
// //         //newDistance = prev_distance+distance;
        
// //         console.log('###### ---- distance: '+parseFloat(distance).toFixed(3)+'km,  total distance: '+parseFloat(newDistance).toFixed(3)+'km,   speed: '+avgSpeedKmh.toFixed(3)+'km/h,  time: '+timeDiffInMilliseconds+'milliseconds   --- #####');
        
// //         //console.log(result[0].total_pulse+jsonObj.pulse);
// //         fs.readFile(`./routes/database/database_files/devices_stats/stats_device_${jsonObj.GSTSerial}.txt`, function(err, data){
// //           if(err) throw err;
  
// //           var deviceObj;
// //           if(data == ""){
// //             deviceObj = [];
// //           }
// //           else{
// //             deviceObj = JSON.parse(data);
// //           }
  
// //           deviceObj[0].update_counter = deviceObj[0].update_counter+1;
// //           deviceObj[0].distance = deviceObj[0].distance+distance;
// //           deviceObj[0].total_pulse = deviceObj[0].total_pulse+result[0].pulse;
  
// //           fs.writeFile(`./routes/database/database_files/devices_stats/stats_device_${deviceObj[0].device_id}.txt`, JSON.stringify(deviceObj) , function(err, data){
// //             if (err) throw err;
// //           })
// //         //     avg_pulse:jsonObj.GSTSerial.pulse,
// //         //     total_pulse:0,
// //         //     bt_time_counter_on: 0, // bluetooth on time (in seconds)
// //         //     bt_time_counter_off: 0, // bluetooth off time (in seconds)
// //         //     device_time_counter_on:0, // device on time (in seconds)
// //         //     device_time_counter_off:0, // device off time (in seconds)
// //         // }
// //         });
// //       }
// //       else{
// //         stat_functions.start_stat(jsonObj,time_stamp);
// //       }

      

// //       // update device data in the devices_cache_data
// //       mysqlPool.query(`UPDATE devices_cache_data
// //       SET log_time="${log_time}",
// //       device_status=1,
// //       latitude="${jsonObj.latitude}",
// //       longitude="${jsonObj.longitude}",
// //       sats="${jsonObj.satellites}",
// //       pulse="${jsonObj.pulse}",
// //       battery="${jsonObj.battery}",
// //       gps_status="${jsonObj.gps_status}",
// //       bt_status="${jsonObj.bt_status}",
// //       gsm_status="${jsonObj.gsm_status}",
// //       sos_status=${jsonObj.sos_status},
// //       avg_speed="${avgSpeedKmh.toFixed(3)}",
// //       distance=${0},
// //       total_pulse=${0},
// //       update_counter=${0}
// //       WHERE device_sn=${jsonObj.GSTSerial}`, function(err, result, fields){
// //         if(err)
// //           throw err;
// //       });


// //     }
// //   })
// // }

// // // calculates distance between two points on a map (lat, lng)
// // let getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2)=>{
// //   var R = 6371; // Radius of the earth in km
// //   var dLat = deg2rad(lat2-lat1);  // deg2rad below
// //   var dLon = deg2rad(lon2-lon1); 
// //   var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
// //   var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
// //   var d = R * c; // Distance in km
// //   return d;
// // }

// // // return degree latitue/longitude to radian latitude/longitude
// // let deg2rad = (deg)=>{
// //   return deg * (Math.PI/180)
// // }

// // // function fetches all devices that are currently 'Online'
// // function get_all_online_devices(callback, app_user_id){
// //   var verified_user = true;
// //   mysqlPool.query(`SELECT * FROM app_users WHERE user_id = ${app_user_id}`, function(err, res, fields){
// //     if(err){
// //       callback(err, res);
// //     }
// //     else{
// //       if(res[0].user_priv == 5){
// //         mysqlPool.query(`SELECT devices_cache_data.device_sn ,devices_cache_data.log_time, devices_cache_data.device_status, devices_cache_data.latitude, devices_cache_data.longitude, devices_cache_data.sats, devices_cache_data.pulse,devices_cache_data.battery,devices_cache_data.gps_status,devices_cache_data.bt_status,devices_cache_data.gsm_status, devices_cache_data.sos_status, devices_cache_data.distance, devices_cache_data.avg_speed,device_users.user_id, device_users.first_name, device_users.last_name,device_users.phone_number_1,device_users.phone_number_2
// //         FROM devices_cache_data
// //         LEFT JOIN device_users
// //         ON device_users.device_sn=devices_cache_data.device_sn
// //         WHERE devices_cache_data.device_status = 1;`, function (error, result, fields) {
// //           if (error){ 
// //              return callback(error,result);
// //           }
// //           else{
// //             return callback(error,result);
// //           }
// //         });
// //       }
// //       else{
// //         callback(err, [{
// //           status: "error",
// //           message: "user has no privileges for this function"
// //         }])
// //       }
// //     }
// //   });
// // }

// // // a special function similar to get_device_updates:
// // // fetches the most recent data about the GST device and checks if the sos_status (sos cutton) was pessed
// // // if the button was pressed (sos_status = 1) then fetches the information about the device user
// // // and adds it to the response JSON string 
// // function get_device_updates_and_check_sos_status(callback, device_id){
// //   mysqlPool.query(`SELECT * FROM devices_cache_data WHERE device_sn = ${device_id}`, function (error, result, fields) {
// //     if (error){ 
// //        return callback(error,result);
// //     }
// //     else{
// //       if(result.length == 0){
// //         callback(error, [{
// //           status : "error",
// //           message : `no cache data for device_id : ${device_id}`
// //         }])
// //       }
// //       else{
// //         if(result[0].sos_status == 1){
// //           mysqlPool.query(`SELECT * FROM device_users WHERE device_sn = ${device_id}`, function(err, devResult, fields){
// //             if(err){
// //               return callback(err, result);
// //             }
// //             else{
// //                 callback(err, [result[0],devResult[0]] );
// //             }
// //           });
// //         }
// //         else{
// //           callback(error, result);
// //         }
// //       }
// //     }
// //   });
// // }

// // // adding new GST device user.
// // // checking if the user_id (teudat zehut) and device serial number are unique
// // // if - same serial number or teudat zehut was added before to some other device
// // // sends a message with details to the client about invalid infomration
// // // else - adding new user to device_users table, app_user_devices, device_cache_data
// // // the GST device will be assigned to the app user who send the request to add new device user
// // function post_add_new_dev_user(callback,devUserObj){

// //   // step 1: check if the ID and device_sn are unique
// //   mysqlPool.query(`SELECT * FROM device_users 
// //   WHERE device_sn=${devUserObj.device_sn}
// //   OR user_id = "${devUserObj.user_id}";`,
// //   function(errorSN, resSN, fields){
// //     if(errorSN){
// //       callback(errorSN, resSN);
// //     }
// //     else{
// //       // if length is NOT 0 then ID and serial number are NOT unique
// //       if(resSN.length != 0){
// //         callback(errorSN, [{
// //           status: "error",
// //           message : "device with the same serial number/user ID already registered"
// //         }]);
// //       }
// //       else{
// //         // STEP 2: add new record to device_users
// //         var sql1 = `INSERT INTO device_users(user_id,device_sn,first_name,last_name,phone_number_1,phone_number_2,address,weight,height,health_insurance)
// //         VALUES ("${devUserObj.user_id}",${devUserObj.device_sn},"${devUserObj.first_name}","${devUserObj.last_name}","${devUserObj.phone_num_1}","${devUserObj.phone_num_2}","${devUserObj.address}",${devUserObj.weight},${devUserObj.height},"${devUserObj.health_insurance}");`;
// //         // execute sql statemnt
// //         mysqlPool.query(sql1, function (err, result) {
// //           if (err) {
// //             return callback(err, result)
// //           }
// //           else{
// //             // STEP 3: add new record to app_user_devices
// //             var date= new Date();
// //             var current_date_time = date.toISOString().slice(0, 19).replace('T', ' ');
// //             var sql2 = `INSERT INTO app_user_devices(device_id, user_id, date_of_activation) VALUES (${devUserObj.device_sn}, ${devUserObj.app_user_id}, "${current_date_time}");`;
// //             mysqlPool.query(sql2, function (err, result) {
// //               if (err) {
// //                 return callback(err, result)
// //               }
// //               else{
// //                 // STEP 4: add new record to device_cache_data
// //                 // set all modules status to 0
// //                 // when device will be turned on = modules will change they're status according to new information from the device
// //                 var sql3 = `INSERT INTO devices_cache_data(device_sn, log_time, device_status, latitude, longitude, sats, pulse, battery, gps_status, bt_status, gsm_status, sos_status, distance, avg_speed)
// //                 VALUES(${devUserObj.device_sn}, "${current_date_time}", 0, "0", "0", 0,0,0,0,0,0,0, "0", "0");`
// //                 mysqlPool.query(sql3, function(error, res){
// //                   if(error){
// //                     return callback(error,res);
// //                   }
// //                   else{
// //                     callback(error, [{
// //                       status : "OK",
// //                       message : "device user added"
// //                     }])
// //                   }
// //                 })
// //               }
// //             });
// //           }
// //         });
// //       }
// //     }
// //   })
  

  

// // }

// module.exports = {
//   get_highest_pulse,
//   get_lowest_pulse,
//   //--------------//
//   user_login,
//   change_user_pass,
//   check_restore_code,
//   send_pass_restore_code,
//   //--------------//
//   post_sos_report,
//   post_new_dev_user: post_add_new_dev_user,
//   //--------------//
//   get_weather_update,
//   //--------------//
//   update_device_cache_data,
//   get_device_updates,
//   //--------------//
//   get_app_user_account,
//   //--------------//
//   get_location_history,
//   //--------------//
//   get_device_user_full_data_by_user,
//   get_device_user_full_data_by_device,
//   get_device_users,
//   get_user_contacts,
//   get_app_user_devices,
//   get_device_updates_and_check_sos_status,
//   get_all_online_devices
// };
  