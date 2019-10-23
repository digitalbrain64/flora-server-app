const express = require('express');
const router = express.Router();

// importing database functionality
const getFunctions = require('../database/database_scripts/get_functions.js');
const otherFunctions = require('../database/database_scripts/other_functions.js');

// route to get location history from device_location_history
router.get('/getLocationHistory', (req, res, next)=>{
  if(req.query.device_sn && req.query.from_date && req.query.to_date){
    getFunctions.get_location_history(function (err, result) {
      if (err)
          res.send([{
            status : "error",
            message : err
          }])
      else {
          res.send(result);          
      }
    },req.query.device_sn, req.query.from_date, req.query.to_date);
  }
  else{
    res.send([{
      status : "error",
      message : "please provide parameters: device id, from date, to date"
    }])
  }
});

// route to get recent data from device_cache_data
router.get('/getDeviceUpdates', (req, res, next) =>{
  if(req.query.flag && req.query.app_user_id && !req.query.device_sn){
    if(req.query.flag == "all" || req.query.flag == "online"){
      getFunctions.get_all_devices_updates(function(err, result){
        if (err){
          res.send([{
            status : "error",
            message : err
          }])
        }
        else
          res.send(result);
      }, req.query.flag, req.query.app_user_id);
    }
    else{
      res.send([{
        status:"error",
        message:"please provide a correct flag"
      }])
    }
  }
  else if (!req.query.flag && !req.query.app_user_id && req.query.device_sn){
    getFunctions.get_device_updates(function (err, result) {
      if (err){
        res.send([{
          status : "error",
          message : err
        }])
      }
      else
        res.send(result);
    }, req.query.device_sn);
  }
  else{
    res.send([{
      status : "error",
      message : "please provide device serial number or a combination of flag and application user ID"
    }])
  }
});

// get all GST devices associated with the app user (devices that the app user can track)
router.get('/getAppUserDevices', (req, res, next) =>{
  if(req.query.user_id){
    getFunctions.get_app_user_devices((error, results)=>{
      if(error){
        res.send([{
          status: 'error',
          message : error
        }]);
      }
      else{
        res.send(results);
      }
    },req.query.user_id)
  }
  else{
    res.send([{
      status : 'error',
      message : 'please provide a user id'
    }])
  }
});

// route to get user from app_users
router.get('/getAppUserAccount', (req, res, next)=>{
    if(req.query.p && req.query.u){
      getFunctions.user_login(function(err, results){
        if(err)
          res.send([{
            status : "error",
            message : err
          }])
        else
          res.send(results);
      }, req.query.u, req.query.p)
    }
    else{
      if(!req.query.p && !req.query.u && req.query.user_id){
        getFunctions.get_app_user_account(function(err, result){
          res.send(result);
        }, req.query.user_id);
      }
      else if (!req.query.p && !req.query.u && !req.query.user_id){
        res.send([{
          status : "error",
          message : "please provide password and username/email"
        }])
      }
      
    } 
});

router.get('/getWeatherUpdate', (req, res, next)=>{
  if(req.query.lat && req.query.lng){
    getFunctions.get_weather_update(function(err, result){
      if(err)
        res.send([{
          status : "error",
          message : err
        }]);
      else
        res.send(result);
    }, req.query.lat, req.query.lng)
  }
  else{
    res.send([{
      status:"error",
      message:"please provide latitude and longitude"
    }])
  }
  
})

/* password restore routes */
// step 1 : getting email or username of the user
// checking whats the phone number and sending verification code to the number
// adding the code to the user in the database
router.get('/sendRestoreCode', (req, res, next)=>{
  if(!req.query.u){
    res.send([{
      status:"error",
      message:"missing username/email"
    }])
  }
  else{
    otherFunctions.send_pass_restore_code(function(err, result){
      if(err)
        res.send([{
          status : "error",
          message : err
        }])
      else
        res.send(result)
    },req.query.u);
  }
  
})

// step 2 : getting the email and the code entered by the user
// validating the code and email if user exists
// if all went well : email sent back to client for later use in the final step
router.get('/checkRestoreCode', (req, res, next)=>{
  if(req.query.restoreCode && req.query.e){
    otherFunctions.check_restore_code(function(err, result){
      if(err)
        res.send([{
          status : "error",
          message : err
        }])
      else
        res.send(result)
    },req.query.e,req.query.restoreCode)
  }
  else{
    res.send([{
      status : "error",
      message : "please provide a restore code and email"
    }])
  }
})

// step 3 : sending the new password and email from previous step
// updating the password and removing the restore_code from user in database
router.get('/passChange', (req, res, next)=>{
  if(req.query.newPass && req.query.e){
    otherFunctions.change_user_pass(function(err, result){
      if(err)
        res.send([{
          status : "error",
          message : err
        }])
        else{
          res.send(result)
        }
    },req.query.e, req.query.newPass)
  }
  else{
    res.send([{
      status : "error",
      message : "please provide new password and email"
    }])
  }
})

router.get('/getLowestPulse', (req, res, next)=>{
  if(!req.query.device_sn){
    res.send([{
      status : "error",
      message : "please provide device id"
    }])
  }
  else{
    getFunctions.get_lowest_pulse(function(err, result){
      if(err)
        res.send([{
          status : "error",
          message : err
        }]);
      else
        res.send(result);
    },req.query.device_sn)
  }
  
})

router.get('/getHighestPulse', (req, res, next)=>{
  if(!req.query.id){
    res.send([{
      status : "error",
      message : "please provide device id"
    }])
  }
  else{
    getFunctions.get_highest_pulse(function(err, result){
      if(err)
        res.send([{
          status : "error",
          message : err
        }]);
      else
        res.send(result);
    },req.query.id)
  }
  
});

// full device user data including contacts
router.get('/getDeviceUserFull',(req, res, next)=>{
  if(!req.query.user_id && !req.query.device_id){
    res.send([{
      status : "error",
      message : "please provide user id or device id"
    }])
  }
  else {
      if(req.query.user_id && !req.query.device_id){
        getFunctions.get_device_user_full_data_by_user((error, result)=>{
          if(error){
            res.send([{
              status: "error",
              message: error
            }])
          }
          else{
            res.send(result);
          }
        },req.query.user_id)
      }
      else if(!req.query.user_id && req.query.device_id){
        getFunctions.get_device_user_full_data_by_device((error, result)=>{
          if(error){
            res.send([{
              status: "error",
              message: error
            }])
          }
          else{
            res.send(result);
          }
        },req.query.device_id)
      }
      else{
        res.send([{
          status: "error",
          message : "you must provide only ONE parameter"
        }])
      }
  }
});

router.get('/getDeviceUser', (req, res, next)=>{
  if(!req.query.user_id){
    res.send([{
      status : "error",
      message : "please provide user id"
    }]);
  }
  else{
    getFunctions.get_device_users((err, result)=>{
      if(err){
        res.send([{
          status : "error",
          message : err
        }]);
      }
      else{
        res.send(result);
      }
    },req.query.user_id)
  }
});

router.get('/getDeviceUserContacts', (req, res, next)=>{
  if(!req.query.user_id){
    res.send([{
      status : "error",
      message : "please provide user id"
    }])
  }
  else{
    getFunctions.get_user_contacts((err, result)=>{
      if(err)
        res.send([{
          status:"error",
          message:err
        }]);
      else
        res.send(result);
    },req.query.user_id)
  }
});

router.get('/getDeviceStatistic', (req, res, next)=>{
  if(!req.query.app_user_id && req.query.device_sn){
      getFunctions.get_device_statistics(function(err, result){
        if (err){
          res.send([{
            status : "error",
            message : err
          }])
        }
        else
          res.send(result);
      }, req.query.device_sn);
  }
  else if (req.query.app_user_id && !req.query.device_sn){
    getFunctions.get_all_devices_statistics(function (err, result) {
      if (err){
        res.send([{
          status : "error",
          message : err
        }])
      }
      else
        res.send(result);
    }, req.query.app_user_id);
  }
  else{
    res.send([{
      status : "error",
      message : "please provide device serial number or application user ID"
    }])
  }
})

router.get('/getSosReports', (req, res, next)=>{
  if(req.query.app_user_id){
    getFunctions.get_sos_reports(function(err, result){
      if (err){
        res.send([{
          status : "error",
          message : err
        }])
      }
      else
        res.send(result);
    }, req.query.app_user_id);
}
else{
  res.send([{
    status:"error",
    message:"please provide application user id"
  }])
}

});

router.get('/getRealTimeSosIncidents', (req, res, next)=>{
  if(req.query.app_user_id){
    getFunctions.get_sos_incidents(function(err, result){
      if (err){
        res.send([{
          status : "error",
          message : err
        }])
      }
      else
        res.send(result);
    }, req.query.app_user_id);
  }
  else{
    res.send([{
      status:"error",
      message:"please provide application user id"
    }])
  }
});

module.exports = router;