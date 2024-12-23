 const {createPool} =require('mysql')
 const dotenv = require('dotenv');

 dotenv.config();
 
 const pool = createPool({
    host:process.env.HOST,
    user:process.env.USER,
    password:process.env.PASSWORD,
    database:process.env.DATABASE
 })

 module.exports = pool