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
            connection.query('INSERT INTO tasks(uid, name, status) values (?, ?, ?)',[user.id, user.name, false], function (err) {
                if (err)
                    console.error({msg:"server internal error.", detail:err.json})
            })
        else // 标记任务完成
            connection.query('UPDATE tasks SET status=true where uid=? and status=false', [user], function (err) {
                if (err)
                    console.error({msg:"server internal error.", detail:err.json})
            })
    }
})

app.get("/tasks/:id", (req,res)=> {
    connection.query('SELECT * FROM tasks WHERE uid=?', [req.params.id], function (err, rows) {
		if (err) {
			res.status(500).send({msg:"server internal error.", detail:err.json}).end()
			return
		}
        msg = {}
        rows.map((row)=>{
            msg["name"] = row.name
            if(!row.status)
                msg["task"] = "you need to activate your account."
            else
                msg["task"] = "your account has been activated."
            msg["status"] = row.status
        })
		res.send(msg).end()
	})
})


app.listen(80, function() {
    console.log("start...\n")
})