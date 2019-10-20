const express = require('express');
const router = express.Router();

// importing database functionality
const postFunctions = require('../database/database_scripts/post_functions.js');

// post data from device
router.post('/postFloraData', (req,res,next) => {   
    // getting client ip address for additional geolocation detection
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : null);
    postFunctions.update_device_cache_data(req.body, ip);
   // console.log(`device id: ${req.body.GSTSerial} - ip address ${ip}`);
    res.sendStatus(200);
    next();
});

router.post('/postNewDeviceUser', (req, res, next) => {
    postFunctions.post_add_new_dev_user(function(err, result){
        if(err){
            res.send([{
                status: "error",
                message: err
            }])
            next();
        }
        else{
            res.send(result);
            next();
        }
    },req.body);
})


router.post('/postSosReport', (req, res, next)=>{
    postFunctions.post_sos_report(req.body);
})

module.exports = router;