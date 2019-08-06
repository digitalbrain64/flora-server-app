const express = require('express');
const router = express.Router();

// importing database functionality
const database = require('./database_functions');

// post data from device
router.post('/postFloraData', (req,res,next) => {   
    // getting client ip address for additional geolocation detection
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : null);
    database.update_device_cache_data(req.body, ip);
    console.log(ip);
    
    res.sendStatus(200);
    next();
});

module.exports = router;