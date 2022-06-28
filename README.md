# my-room
This is a node.js application that demostrait a smart room - represnted by Arduino UNO and powered by Express.js, Johnny-Five and MongoDB.

## Screenshots
<table>
  <tr>
    <td>mobile</td>
    <td>desktop</td>
  </tr>
  <tr>
    <td width="30%"><img src="https://user-images.githubusercontent.com/64268905/176064442-3cb5c025-74ce-4452-840c-9166efa1dc0a.PNG"></td>
    <td width="70%"><img src="https://user-images.githubusercontent.com/64268905/176065734-c57459fd-55de-42b3-b2e8-0e6cc9ecdc7e.png"></td>
  </tr>
   <tr>
    <td width="30%"><img src="https://user-images.githubusercontent.com/64268905/176066964-d4ee8e7b-97e8-4527-a893-ae288cb6c427.PNG"></td>
    <td width="70%"><img src="https://user-images.githubusercontent.com/64268905/176067867-d05bcf5d-f987-42a4-bb2b-3ff510582279.png"></td>
  </tr>
   <tr>
    <td width="30%"><img src="https://user-images.githubusercontent.com/64268905/176067031-df4ad008-5a8f-4df2-8cd0-b4b63669a5dd.PNG"></td>
    <td width="70%"><img src="https://user-images.githubusercontent.com/64268905/176067949-c8f780c4-52de-4d9d-9f28-20d741aa4a2e.png" ></td>
  </tr>
</table>

## Technologies
This project was created with: 
* express : 4.17.3
* ejs : 3.1.8
* mongoose : 6.3.8
* johnny-five : 1.0.0
* bcrypt : 5.0.1
* crypto-js : 4.1.1
* cookie-parser : 1.4.6

## Setup and configuration

### pre setup
Should be installed:
* Arduino IDE
* Mongo DB
* Node.js

### Setting up the arduino uno board
* Open Arduino IDE
* Connect your arduino uno to your computer
* Navigate to File => Examples => Firmata => StandardFirmataPlus
* Load sketch onto board
* connect your 330Ω resistors, led and photoresistor like so:
![IMG_0086](https://user-images.githubusercontent.com/64268905/176052903-ddc97250-d398-4f72-a14d-931e9cbec789.jpeg)


### Setting up the application
go to "my-room" folder and create a .env file:
```
$ cd [path_to_my-room]
$ touch .env
```
In the .env file add this line:
```
COOKIE_ENC_KEY="write here anything"
ENCKEY="write here somthing else"
```
You can run the application with [https protocol](#running-with-https) or with [http protocol](#running-with-http)


#### Running with http
in the index.js file, uncomment those lines: 
![Screenshot from 2022-06-28 02-24-03](https://user-images.githubusercontent.com/64268905/176054317-625d39e1-e5b1-4f2b-a4cd-cf8f0f50768b.png)


in the same file, comment out those lines 
![Screenshot from 2022-06-28 02-24-03](https://user-images.githubusercontent.com/64268905/176055483-8e0c4854-dd42-4d48-ac55-33d0238b595b.png)


continue to [installation](#installation)


#### Running with https
create your self signed certificate using openssl in terminal:
```
openssl req -new -x509 -keyout server.key -out server.pem -days 3650 -nodes
openssl x509 -outform pem -in server.pem -out server.crt
```

using any text editor, open the server.key file and copy it's content
paste the content in the .env file with quation marks in the beginning and end like so:
```
KEY="content_of_server.key"
```

do the same with server.crt
```
CRT="content_of_server.crt"
```

#### Installation
* run the following command using terminal
```
$ npm init -y
$ npm install
$ npm start
```

* In your favorite browser search (using http or https - acording to your setup):
http(s)://localhost:3000/setup
* register there to the room db
* your will be redirected to http(s)://localhost:3000/ and now you are ready control the smart room via the web-application!


## TODO
* adding admin mode
* adding "new user registration request" option

