const express = require("express")

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const mysql = require('mysql')
const connection = mysql.createConnection({
  host: 'mysql_task',
  user: 'root',
  password: '123456',
  'database': 'lab2'
})
connection.connect()

const { Kafka } = require('kafkajs')
const kafka = new Kafka({
  clientId: 'task',
  brokers: ['kafka:9092']
})

// 创建任务
const consumer = kafka.consumer({ groupId: 'task' })
consumer.connect()
consumer.subscribe({ topic: 'tasks', fromBeginning: true })
consumer.run({
	eachMessage: async ({ topic, partition, message }) => {
        user = JSON.parse(message.value)
        if(message.key == "init") // 添加任务
            connection.query('INSERT INTO tasks(uid, name, department, status) values (?, ?, ?, ?)',[user.id, user.name, user.department, false], function (err) {
                if (err) {
                    console.error({msg:"server internal error.", detail:err.json})
                }
                console.info({msg:"add new task!"})
            })
        else if(message.key == "activate")// 标记任务完成
            connection.query('UPDATE tasks SET status=true where uid=? and status=false', [user], function (err) {
                if (err) {
                    console.error({msg:"server internal error.", detail:err.json})
                }
                console.info({msg:"task finish successfully!"})
            })
        else if(message.key == "modify") // 修改部门
            connection.query('UPDATE tasks SET department=? WHERE uid=?', [user.department, user.id], function (err) {
                if (err) {
                    console.error({msg:"server internal error.", detail:err.json})
                }
                console.info({msg:"department modified!"})
            })
    }
})

// 按用户查询任务
app.get("/tasks/:id", (req,res)=> {
    connection.query('SELECT * FROM tasks WHERE uid=?', [req.params.id], function (err, rows) {
		if (err) {
			res.status(500).send({msg:"server internal error.", detail:err.json}).end()
			return
		}
        msg = {}
        rows.map((row)=>{
            msg["name"] = row.name
            msg["department"] = row.department
            if(!row.status)
                msg["task"] = "you need to activate your account."
            else
                msg["task"] = "your account has been activated."
            msg["status"] = (row.status == 1 ? "complete" : "incomplete")
            console.log(msg)
        })
		res.send(msg).end()
	})
})

// 按部门统计任务完成情况
app.get("/tasks/department/:department", (req,res)=> {
    connection.query('SELECT COUNT(department) AS task_finish FROM tasks WHERE department = ? AND status = 1', [req.params.department], function (err, rows) {
        if (err) {
			res.status(500).send({msg:"server internal error.", detail:err.json}).end()
			return
		}
        msg = {}
        rows.map((row)=>{
            msg[req.params.department] = row.task_finish
            console.log(msg)
        })
        res.send(msg).end()
    })
})

// 统计所有部门的任务完成情况
app.get("/tasks/status/:status", (req,res)=> {
    connection.query('SELECT department, COUNT(department) AS task_finish FROM tasks WHERE status = ? GROUP BY department', [req.params.status], function (err, rows) {
        if (err) {
			res.status(500).send({msg:"server internal error.", detail:err.json}).end()
			return
		}
        msg = {}
        rows.map((row)=>{
            msg[row.department] = row.task_finish
            console.log(msg)
        })
        res.send(msg).end()
    })
})

app.listen(80, function() {
    console.log("start...\n")
})