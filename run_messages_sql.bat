@echo off
echo Creating messages tables...
mysql -u root -p12345678 social_media_db < backend/create_messages_table.sql
echo Done!
pause 