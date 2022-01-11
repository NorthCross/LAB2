# 高级软件开发LAB2

## 运行方式

直接在LAB2目录下运行docker-compose up

## 项目架构

分为四个系统：员工系统，用户系统，任务系统，报表系统（未完成）

### 工作流程

1. 在员工管理系统中注册新员工（包括工号，姓名，部门）后，会自动在用户管理子系统中注册一个用户，用户名为工号，密码随机生成【实际的应用会通过邮件将初始密码发给用户，但发送邮件这部分内容不必实现，密码通过log获取】。
2. 系统中新注册的用户都会产生一条任务，记录在任务管理系统中，提醒用户需要修改密码才能从待激活状态转变为激活状态，任务的初始状态为待完成，完成后标记为完成。
3. 需要能够从系统中获取任务完成情况报表：每个部门所属员工未完成任务的总数量。

### 员工系统

端口：8080

#### 数据库表（employees）结构

| 字段       | 类型        | 意义   |
| ---------- | ----------- | ------ |
| id         | int         | 用户id |
| name       | varchar(20) | 用户名 |
| department | varchar(20) | 部门   |

#### kafka消息

- 添加员工后发送消息(格式：{"id":"", "name":"", "depatment":""})到 **register**  Topic
- 修改部门后发送消息(格式：{"id":"","department":""})到 **tasks** Topic

#### API

| 功能     | 方式 | URL            | payloads                        |
| -------- | ---- | -------------- | ------------------------------- |
| 注册     | POST | /employees     | {id:"", name:"", department:""} |
| 修改部门 | PUT  | /employees/:id | {deparment:""}                  |

### 用户系统

端口：8081

#### 数据库表（users）结构

| 字段   | 类型        | 意义     |
| ------ | ----------- | -------- |
| id     | int         | 用户id   |
| passwd | varchar(20) | 密码     |
| status | bool        | 是否激活 |

#### kafka 消息

- 接收 **register** Topic 的注册消息，注册完后，发送消息格式(key:"init", value:{"id":"", "name":"", "depatment":""})到 **tasks** Topic
- 修改密码后发送消息(key:"activate", value:{"id":""})到 **tasks** Topic

#### API

| 功能     | 方式 | URL          | payloads             |
| -------- | ---- | ------------ | -------------------- |
| 登录     | POST | /users/login | {id:"", password:""} |
| 修改密码 | PUT  | /users/:id   | {password:""}        |

### 任务系统

端口：8082

#### 数据库表（tasks）结构

| 字段       | 类型        | 意义     |
| ---------- | ----------- | -------- |
| id         | int         | 任务id   |
| uid        | int         | 用户id   |
| name       | varchar(20) | 用户名   |
| department | varchar(20) | 部门     |
| status     | bool        | 是否完成 |

#### kafka消息

- 接收 **taks** Topic, 根据消息key值判断新增任务还是完成任务

#### API

| 功能                 | 方式 | URL                           |
| -------------------- | ---- | ----------------------------- |
| 查看用户任务         | GET  | /tasks/:id                    |
| 查看指定部门完成任务 | GET  | /tasks/department/:department |
| 查看所有部门完成任务 | GET  | /tasks/status/:status         |
