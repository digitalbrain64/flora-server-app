this folder includes a utility file devices_update_status.txt, this file is for monitoring the status of each device.
the file acts as a json array and when device becomes "online" , a json object is added to the array.
when device goes "offline", json object is removed from the array.
the files stores the time of last update and the history counter which is neede for knowing after how many updates to add a history record to the device_history mysql table.
by knowing when was the last update from the device we can know if it stopped sending updates (no new updates from the device for a period of time between last update time and current time).\
if the device has not sent any new updates for the past 8 seconds, is is considered as "offline" and must be removed from the file.


