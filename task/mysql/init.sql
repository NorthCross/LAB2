USE lab2;
DROP TABLE IF EXISTS tasks;
CREATE TABLE tasks(id int PRIMARY KEY AUTO_INCREMENT, uid int, name varchar(20), status bool);