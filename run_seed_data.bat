@echo off
echo Creating database schema...
C:\xampp\mysql\bin\mysql -u root -p12345678 < social_media_schema.sql
echo Running seed data SQL script...
C:\xampp\mysql\bin\mysql -u root -p12345678 social_media_db < backend\seed_data.sql
echo Done!
pause 