USE lab2;
DROP TABLE IF EXISTS users;
CREATE TABLE users(id int PRIMARY KEY, passwd varchar(20), status bool);