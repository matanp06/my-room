require('dotenv').config();
const bcrypt = require("bcrypt");
const CryptoJS = require("crypto-js");
const enc = require("crypto-js/aes");

// encrypting object using AES
const encryptObject =  function(obj){

    const encryptedString = enc.encrypt(JSON.stringify(obj),process.env.ENCKEY).toString();
    return encryptedString;

}

// encrypting object using AES
const decryptObject = function(str){

    const bytes = enc.decrypt(str,process.env.ENCKEY);
    const decryptedObject = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return decryptedObject;

}

// hashing strings
const hashAndSalt = async function(str){
    const saltRounds = 10;
    const hash = await bcrypt.hash(str,saltRounds);
    return hash;
}

//comparing string to hash
//returns true if str and hash are matching else returns false.
const compareStringToHash = async function(str,hash){
    const result = await bcrypt.compare(str,hash);
    return result;
}

module.exports = {

    encryptObject:encryptObject,
    decryptObject:decryptObject,
    hashAndSalt:hashAndSalt,
    compareStringToHash:compareStringToHash

};
