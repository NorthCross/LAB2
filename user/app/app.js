const express = require("express")

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const mysql = require('mysql')
const connection = mysql.createConnection({
  host: 'mysql_user',
  user: 'root',
  password: '123456',
  'database': 'lab2'
})
connection.connect()


const { Kafka } = require('kafkajs')
const kafka = new Kafka({
  clientId: 'user',
  brokers: ['kafka:9092']
})
const producer = kafka.producer()
producer.connect()

// 密码生成
const pasArr = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','0','1','2','3','4','5','6','7','8','9','_','-','$','%','&','@','+','!'];
const genPass = () => {
    let password = ""
    for (var i=0; i<8; i++){
        var x = Math.floor(Math.random()*8)
        password += pasArr[x]
    }
    return password
}

// 用户注册
const consumer = kafka.consumer({ groupId: 'user' })
consumer.connect()
consumer.subscribe({ topic: 'register', fromBeginning: true })
consumer.run({
	eachMessage: async ({ topic, partition, message }) => {
        user = JSON.parse(message.value)
        password = genPass()
        console.log("password of " + user.id + ":" + password)
        connection.query('INSERT INTO users values (?, ?, ?)', [user.id, password, false], function (err) {
            if (err) {
                if (err.errno == 1062)
                    console.error({msg:"user exists."})
                else {
                    console.error({msg:"server internal error."})
                    return;
                }
            }
            console.info({msg:"register successfully!"})
            producer.send({ // 发送任务消息
                topic: 'tasks',
                messages:[
                    {key:"init",
                        value:JSON.stringify(user)},
                ]
            }).catch(e => console.error(`[example/producer] ${e.message}`, e))
	    })
    }
})

// 退出时断开数据库等连接
process.on('exit', () => {
	connection.destroy()
	producer.disconnect()
    consumer.disconnect()
})

// 登录
app.post('/users/login', (req, res)=>{
    user = req.body
    connection.query('SELECT id, passwd FROM users WHERE id=?', [user.id], function (err,results) {
    	if (err) {
            res.status(500).send({msg:err.json}).end()
            return
		}
        if(results.length == 0)
            res.send({msg:"user does not exist."}).end()
        else if(results[0].passwd != user.password)
            res.send({msg:"Wrong id or password."}).end()
		else
            res.send({msg:"success"}).end()
    })
})

// 修改密码
app.put("/users/:id", (req, res) => {
    user = req.body
    connection.query('UPDATE users SET passwd=?,status=true WHERE id=?', [user.password, req.params.id], function (err,results) {
		if (err) {
			res.status(500).send({msg:"server internal error."}).end()
			return
		}
        if(results.changedRows == 0)
            res.send({msg:"user does not exist or password does not change."}).end()
        else {
		    res.send({msg:"success"}).end()
            producer.send({ // 发送任务消息
                topic: 'tasks',
                messages:[
                    {key:"activate",
                        value:req.params.id},
                ]
            }).catch(e => console.error(`[example/producer] ${e.message}`, e))
        }
	})
})

app.listen(80, function() {
    console.log("start...\n")
})