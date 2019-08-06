const express = require('express');
const router = express.Router();

// importing database functionality
const database = require('./database_functions');

// route to get location history from device_location_history
router.get('/getLocationHistory', (req, res, next)=>{
  console.log(`#########\nfetching location history:\ndevice_sn: ${req.query.device_sn}\nfrom_date: ${req.query.from_date}\nto_date: ${req.query.to_date}`);
  database.get_location_history(function (err, results) {
    if (err) console.log("Database error!");
    else {
        res.send(JSON.stringify(results));
        console.log(`results found: ${results.length}\n#########`);
        next();
    }
  },req.query.device_sn, req.query.from_date, req.query.to_date);
});

// route to get recent data from device_cache_data
router.get('/getDataFromCache', (req, res, next) =>{
  console.log("fetching data for device_sn: "+req.query.device_sn);
  database.get_user_data_from_cache(function (err, results) {
      if (err)
        console.log("Database error!");
      else
        res.send(JSON.stringify(results[0]));
      next();
  }, req.query.device_sn);
});

// route to get user from app_users
router.get('/getUserData', (req, res, next)=>{
    if(!req.query.u){
      database.get_user(function(err, results){
        if(err)
          console.log("Database error");
        else
          res.send(results[0]);
        next();
      }, req.query.e, req.query.p)
    }
    else{
      database.get_user(function(err, results){
        if(err)
          console.log("Database error");
        else
          res.send(results[0]);
        next();
      }, req.query.u, req.query.p)
    }
    
});

module.exports = router;