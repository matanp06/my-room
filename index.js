require('dotenv').config();
const express = require("express");
let arduino = require('johnny-five');
const https = require('https');
const ejs = require('ejs');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

mongoose.connect("mongodb://localhost:27017/MyRoom");

const sessionSchema = new mongoose.Schema({
    key: String,
    loggedIn: Boolean,
    date: Date
})

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    sessionKey: sessionSchema
});


const User = mongoose.model('User',userSchema);


// --------------------------------------------------------------------------------------
//Board Section
let board = new arduino.Board();
let led;
let sensor;
let automathic = false;

board.on("ready", function () {
    led = new arduino.Led(7);
    sensor = new arduino.Sensor("A0");

    // in case that automathic light mode is on
    if (automathic) {

        autoLight();

    }

});

// AUTO LIGHT
// controling light automaticlly depands on the light outside
function autoLight() {

    sensor.on("change", function () {
        if (!automathic)
            return;

        let light = this.scaleTo(0, 1023)
        console.log(light);

        // turining on or of the light according the outside light level
        if (light > 950)
            led.on();
        else
            led.off();

    });
}
//Board Section end
// --------------------------------------------------------------------------------------




// --------------------------------------------------------------------------------------
// Server Section
const app = express();
app.set('view engine','ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname+'/public'));

app.get('/',(req,res)=>{
    res.render('login.ejs',{});
})

//LOG IN
app.post('/log-in',function (req, res) {
    const username = req.body.username;
    const password = req.body.password;
    console.log(password);

    //Trying to find the username in the DB
    User.findOne({username: username})
    .then((user)=>{
        if(user){ //User found
            // comparing the entered password with the hashed one
            bcrypt.compare(password,user.password)
            .then((result) => {
                if(result){//passwords match
                    let key = keyGenerator();
                    console.log(key);
                    user.sessionKey = {
                        key: key,
                        loggedIn:true,
                        date: new Date()
                    }

                    //updating the user's sessionKey in the database
                    user.save().then(()=>{
                        res.render("room.ejs",{username:username, key,key});
                    }).catch((err)=>{console.log(err)});
                }
                else{//passwords aren't match
                    console.log("username or password incorrect");
                    res.redirect("/");
                }
            })
            .catch((err) => {console.log(err);});   
        } else {//User wasn't found
            console.log("username or password incorrect");
            res.redirect("/");
        }
        
    })
    .catch((err) => {console.log(err);});

});

//LED ON
//updated with auth
app.post('/led-on', function (req, res) {

    const username = req.body.username;
    const key = req.body.key;
    console.log(key);

    //autinticatin user
    User.findOne({username:username, "sessionKey.key":key,"sessionKey.loggedIn":true},
    function(err,user){
        if(err){
            console.log(err);
            res.redirect("/");
        } else if(user){//User found 
            isSessionDateValid(user).then((result)=>{
                if(result){ // Session date is valid ==> user authenticated
                    automathic = false; //settign authomaticlight mode to off
                    led.on();
                    res.render('room.ejs',{username:username, key:key});
                    console.log('LED ON');
                } else { // Session date isn't vaild
                    resetSession(user,function(){
                        res.redirect("/");
                    });    
                }
            }).catch((err)=>{console.log(err)});            
        } else {//Authintication failed
            console.log("user not found");
            res.redirect("/");
        }
    });
});

//LED OFF
//updated with auth
app.post('/led-off', function (req, res) {

    const username = req.body.username;
    const key = req.body.key;
    console.log(key);

    //autinticatin user
    User.findOne({username:username, "sessionKey.key":key,"sessionKey.loggedIn":true},
    function(err,user){
        if(err){
            console.log(err);
            res.redirect("/");
        } else if(user){//user found
            isSessionDateValid(user).then((result)=>{
                if(result){// Session date is valid ==> user authenticated
                    automathic = false; //settign authomatic light mode to off
                    led.off();
                    console.log('LED OFF');
                    res.render('room.ejs',{username:username, key:key});
                } else {//Session date isn't valid
                    resetSession(user,function(){
                        res.redirect("/");
                    });
                }
            }).catch( (err) => {console.log(err);});
        } else {//Authintication failed
            res.redirect("/");
        }
    });
});

//AUTO LED ON
//updated with auth
app.post('/a-on', function (req, res) {


    const username = req.body.username;
    const key = req.body.key;
    console.log(key);

    //autinticatin user
    User.findOne({username:username, "sessionKey.key":key,"sessionKey.loggedIn":true},
    function(err,user){
        if(err){
            console.log(err);
            res.redirect("/");
        } else if(user){//User found
            isSessionDateValid(user).then((result)=>{
                if(result){ //Session date is valid
                    automathic = true;  //settign authomaticlight mode to on
                    autoLight();
                    console.log("autoLight");
                    res.render('room.ejs',{username:username, key:key});
                } else { //Session date isn't valid
                    resetSession(user,function(){
                        res.redirect("/");
                    });
                }
            }).catch((err)=>{console.log(err)});  
        } else {//Authintication failed
            res.redirect("/");
        }
    });
});


//LOG OUT
app.post('/log-out', function(req,res){
    const username = req.body.username;
    const key = req.body.key;

    //autinticatin user
    User.findOne({username:username,"sessionKey.key":key})
    .then((user)=>{resetSession(user)})
    .catch((err)=>{console.log(err)});
    res.redirect("/");
});

//respone to 404
app.get('/*', function (req, res) {
    res.send('page does\'t found');
})

// --------------------------------------------------------------------------------------
//former not secure communication
// app.listen(3000, function () {
//     console.log('im listening');
// });
// --------------------------------------------------------------------------------------


const options = {
    key: process.env.KEY,
    cert: process.env.CRT
};

const server = https.createServer(options,app);
server.listen(3000,function(){
    console.log("server is running with https");
});

// Server section end
// --------------------------------------------------------------------------------------





//KEY GENERATOR
//create a key to authinticate user
function keyGenerator() {

    let key = "";

    const charType = {
        sign : 0,
        capitalLetter : 1,
        lowerCaseLetter :2
    }

    for (let i = 0; i < 72; i++) {
        let condition = Math.floor(Math.random() * 3);
        let char;

        //Selecting the next char acording the random charType
        if (condition == charType.sign)
            char = Math.floor(Math.random() * 26) + 65;

        else if (condition == charType.capitalLetter)
            char = Math.floor(Math.random() * 26) + 97;

        else
            char = Math.floor(Math.random() * 32) + 33;

        key = key + String.fromCharCode(char);
    }

    return String(key);

}

//caluclating the diffrance between two times in hours
const getTimeDiffInHours = function(date1,date2){
    let diff = date2-date1;// time diffrance in milliseconds
    return diff/(3600*1000)// returning time diffrance in hours
}

//checking if the date of the session is valid (less then an hour)
const isSessionDateValid = function(user){
    return new Promise(function(resolve,reject){
  
        const sessionDate = user.sessionKey.date;
        const currentDate = new Date();
        if(getTimeDiffInHours(sessionDate,currentDate)<1){ //session date is valid
            user.sessionKey.date = currentDate;
            user.save(function(err){//upadting the session date
                if(err){
                    console.log(err)
                    reject(err);
                }
                resolve(true);
            });
        } else { // session date isn't vaild
            resolve(false);
        }
    
    });   
}

// Reseting the user sessionKey to "not loged in"
const resetSession = async function(user,cb){
    user.sessionKey = {
        key: "",
        loggedIn: false,
        date: undefined
    };

    user.save().then(()=>{//saving the sessionKey
        console.log("updated");
        if(cb)
            cb();
    }).catch((err)=>{console.log(err);});
    
}
