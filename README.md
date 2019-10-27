# flora-server-app
GST Service main server application.
GST service is a system that allows you to track and monitor GST devices all around the globe.
GST devices are sending data to the GST main server every 3 seconds.
The GST server is storing the data in the MySQL database and does some calculations.

Main functions on the server:
1) Responding to the data from GST devices and storing the data inside the correct MySQL tables.
2) Calculating statistics for each device. That includes:
    1) Average heartrate for the past minute, day.
    2) Speed at which the GST device is moving.
    3) Distance the GST device has traveled.
    
    all these statistics are stored in the correct MySql tables.

Apart from tracking and monitoring the GST devices the server also acts as REST API and serves the needed data to the applications of the GST service.
There are various GET's and POST's that the server can handle correcly and fetch the needed data.

Server can handle (tested 100%) from 9-12 GST devices at the same time as well as serving the neede data to the various applications.

