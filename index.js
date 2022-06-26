require('dotenv').config();
const express = require("express");
let arduino = require('johnny-five');
const https = require('https');
const ejs = require('ejs');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const encAndHash = require('./encryptionAndHash');
// const { enc } = require('crypto-js');

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
app.use(cookieParser(process.env.COOKIE_ENC_KEY));

app.get('/',(req,res)=>{

    let cookie = req.signedCookies.sessionKey;
    if(cookie){//trying to validate with cookie
        cookie = encAndHash.decryptObject(cookie);
        const username = cookie.username;
        const key = cookie.key;
        User.findOne({username:username,"sessionKey.key":key,"sessionKey.loggedIn":true},
        function(err,user){
            if(err){
                console.log(err);
                res.redirect("/log-in");
            } else if(user){//user found
                isSessionDateValid(user).then((result)=>{
                    if(result){// session date is valid
                        res.render("room.ejs");
                    } else {//session time isn't valid
                        res.clearCookie("sessionKey");
                        res.redirect("/log-in");
                    }
                }).catch((err)=>{
                    console.log(err);
                    res.redirect("/log-in");
                });
            } else {// user wasn't found
                res.redirect("/log-in");
            }
        });
    } else {//cookie wasn't found
        res.redirect("/log-in");
    }

});

//LOG IN
app.get('/log-in',function(req,res){
    res.render('login.ejs',{});
})

app.post('/log-in',function (req, res) {
    const username = req.body.username;
    const password = req.body.password;
    console.log(password);

    //Trying to find the username in the DB
    User.findOne({username: username})
    .then(async (user)=>{
        if(user){ //User found
            // comparing the entered password with the hashed one
            const passwordsMatching = await encAndHash.compareStringToHash(password,user.password);
            if(passwordsMatching){
                let key = keyGenerator();
                    console.log(key);
                    user.sessionKey = {
                        key: key,
                        loggedIn:true,
                        date: new Date()
                    }

                    //updating the user's sessionKey in the database
                    user.save().then(()=>{
                        let cookieData = {
                            username: username,
                            key:key
                        };

                        cookieData = encAndHash.encryptObject(cookieData);
                        console.log(cookieData);
                        
                        //creating cookies and redirect to the the root (room) page
                        res.cookie('sessionKey',cookieData,{signed:true}).redirect("/");
                    }).catch((err)=>{console.log(err)});
            } else {
                console.log("username or password incorrect");
                res.redirect("/");
            }
              
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
    
    //getting session data from cookie
    let cookie = req.signedCookies.sessionKey;
    if(cookie){//checking that the cookie still exists
        cookie = encAndHash.decryptObject(cookie);
        const username = cookie.username;
        const key = cookie.key;
        console.log(key);
    
        //autinticatin user
        User.findOne({username:username, "sessionKey.key":key,"sessionKey.loggedIn":true},
        function(err,user){
            if(err){
                console.log(err);
                res.redirect("/log-in");
            } else if(user){//User found 
                isSessionDateValid(user).then((result)=>{
                    if(result){ // Session date is valid ==> user authenticated
                        automathic = false; //settign authomaticlight mode to off
                        led.on();
                        res.render('room.ejs');
                        console.log('LED ON');
                    } else { // Session date isn't vaild
                        resetSession(user,function(){
                            res.redirect("/log-in");
                        });    
                    }
                }).catch((err)=>{console.log(err)});            
            } else {//Authintication failed
                console.log("user not found");
                res.redirect("/log-in");
            }
        });
    
    } else {
        res.redirect("/log-in");
    }
});

//LED OFF
//updated with auth
app.post('/led-off', function (req, res) {

    //getting session data from cookie
    let cookie = req.signedCookies.sessionKey;
    if(cookie){//checking that the cookie still exists
        cookie = encAndHash.decryptObject(cookie);
        const username = cookie.username;
        const key = cookie.key;
        console.log(key);
    
        //autinticatin user
        User.findOne({username:username, "sessionKey.key":key,"sessionKey.loggedIn":true},
        function(err,user){
            if(err){
                console.log(err);
                res.redirect("/log-in");
            } else if(user){//user found
                isSessionDateValid(user).then((result)=>{
                    if(result){// Session date is valid ==> user authenticated
                        automathic = false; //settign authomatic light mode to off
                        led.off();
                        console.log('LED OFF');
                        res.render('room.ejs');
                    } else {//Session date isn't valid
                        resetSession(user,function(){
                            res.redirect("/log-in");
                        });
                    }
                }).catch( (err) => {console.log(err);});
            } else {//Authintication failed
                res.redirect("/log-in");
            }
        });
    
    } else {
        res.redirect("/log-in");
    }
});

//AUTO LED ON
//updated with auth
app.post('/a-on', function (req, res) {

    //getting session data from cookie
    let cookie = req.signedCookies.sessionKey;
    if(cookie){//checking that the cookie still exists
        cookie = encAndHash.decryptObject(cookie);
        const username = cookie.username;
        const key = cookie.key;
        console.log(key);
    
        //autinticatin user
        User.findOne({username:username, "sessionKey.key":key,"sessionKey.loggedIn":true},
        function(err,user){
            if(err){
                console.log(err);
                res.redirect("/log-in");
            } else if(user){//User found
                isSessionDateValid(user).then((result)=>{
                    if(result){ //Session date is valid
                        automathic = true;  //settign authomaticlight mode to on
                        autoLight();
                        console.log("autoLight");
                        res.render('room.ejs');
                    } else { //Session date isn't valid
                        resetSession(user,function(){
                            res.redirect("/log-in");
                        });
                    }
                }).catch((err)=>{console.log(err)});  
            } else {//Authintication failed
                res.redirect("/log-in");
            }
        });
    
    } else {
        res.redirect("/log-in");
    }
});


//LOG OUT
app.post('/log-out', function(req,res){

    //getting session data from cookie
    let cookie = req.signedCookies.sessionKey;
    if(cookie){//checking that the cookie still exists
        cookie = encAndHash.decryptObject(cookie);
        const username = cookie.username;
        const key = cookie.key;
        res.clearCookie("sessionKey");
    
        //autinticatin user
        User.findOne({username:username,"sessionKey.key":key})
        .then((user)=>{resetSession(user)})
        .catch((err)=>{console.log(err)});
        res.redirect("/log-in");
    
    } else {
        res.redirect("/log-in");
    }
});

//SETUP
app.get("/setup",function(req,res){

    //checking if there is no users in the db
    User.findOne({})
    .then((user)=>{
        //if there is at least on user => not allowing to setup
        if(user){
            res.redirect('/');
        } else {
            res.render('setup.ejs');
        }
    })
    .catch((err)=>{
        console.log(err);
        res.redirect('/setup');
    });

});


app.post("/setup",function(req,res){

    //checking if there is no users in the db
    User.findOne({})
    .then(async (user)=>{
        //if there is at least on user => not allowing to setup
        if(user){
            res.redirect("/");
        } else {// there are no users in the db
            const username = req.body.username;
            if((username)&&(username != "")){//username field is valid
                let password = req.body.password;
                if(passwordIsLegal(password)){

                    //hashing the users password
                    password = await encAndHash.hashAndSalt(password);

                    const key = keyGenerator();
                    const date = new Date();

                    //saving the new user in the db
                    const user = new User({
                        username: username,
                        password: password,
                        sessionKey: {
                            key: key,
                            loggedIn: true,
                            date: date
                        }
                    });
                    user.save()
                    .then(()=>{
                        //creating cookies and redirect to the the root (room) page
                        let cookieData = {
                            username: username,
                            key:key
                        };                    
                        cookieData = encAndHash.encryptObject(cookieData);
                        res.cookie('sessionKey',cookieData,{signed:true}).redirect("/");
                    })
                    .catch((err)=>{
                        console.log(err);
                    });
                }
                else{//password isn't legal
                    res.redirect("/setup");
                } 
            } else {//username is an empty field or not provided
                res.redirect('/setup');
            }
        }
    });
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
        if (condition == charType.capitalLetter)
            char = Math.floor(Math.random() * 26) + 65;

        else if (condition == charType.lowerCaseLetter)
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

//Checking password legality
const passwordIsLegal = function(password){
    const atLeast8Chars = (password.length >= 8);

    //true if the password contains a digit
    const hasDigits =  /\d/.test(password);

    //true if the password contains a letter
    const hasLetters =  /[a-zA-Z]/.test(password);

    //true if the password contains a sign
    const hasSigns =  /([\x21-\x2F]|[\x3A-\x40]|[\x5B-\x60]|[\x7B-\x7E])/.test(password);
    return(atLeast8Chars&&hasDigits&&hasLetters&&hasSigns);
}
