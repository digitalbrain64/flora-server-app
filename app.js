const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;
const getRoutes = require('./routes/database/getData');
const postRoutes = require('./routes/database/postData');

app.get('/', (req,res,next)=>{
    res.send("hello From Flora On Heroku");
});
app.use(bodyParser.json());
app.use(getRoutes);
app.use(postRoutes);
console.log("server is listening");

// listening on available port (set by cloud or default 3000)
app.listen(port, () =>{
    console.log(`Server is listening on port ${port}`);
  });