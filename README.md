# flora-server-app
GST Service main server application for tracking GST device in real-time.
GST devices are equipped with a GPS module, GSM module (with SIM card) , Heart-rate sensor, Bluethooth Module.
GST device are sending data (JSON string through HTTP protocol) to the GST main server.

The data that is sent to the main GST server:
1) heart rate of the user.
2) GPS location of the user (latitude, longitude).
3) Status of every module: percentage of the battery, it GPS is on or off, is the Bluetooth module is on or off etc...



The GST server is storing the data in the MySQL database and does calculations.

Main functions on the server:
1) Responding to the data from GST devices and storing the data inside the correct MySQL tables.
2) Calculating statistics for each device. That includes:
    1) Average heartrate for the past minute, day.
    2) Speed at which the GST device is moving.
    3) Distance the GST device has traveled.
    
    all these statistics are stored in the correct MySql tables.

4) Saving History about every device. The server adds a history record to the correct table every 5 minutes.
this includes the location and the heartrate of the GST device user.

5) Monitoring "emergancy" calls from the GST devices. Every GST device has an "SOS" button that the user must press when he needs urgent medical assistance.
The server stores these "SOS" calls inside an "Incidents" table.

6) The server calculates the speed and the distance that the user is moving in real-time.
7) The server tracks every device and knows when the device is "online" or "offline".

Apart from tracking and monitoring the GST devices the server also acts as REST API and serves the needed data to the applications of the GST service.
There are various GET's and POST's that the server can handle correcly and fetch the needed data.

Server can handle (tested 100%) from 9-12 GST devices at the same time as well as serving the neede data to the various applications.

