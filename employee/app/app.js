const express = require("express")

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 连接kafka
const { Kafka } = require('kafkajs')
const kafka = new Kafka({
  clientId: 'employee',
  brokers: ['kafka:9092']
})
const producer = kafka.producer()
producer.connect()

// 连接数据库
const mysql = require('mysql')
const connection = mysql.createConnection({
  host: 'mysql_employee',
  user: 'root',
  password: '123456',
  'database': 'lab2'
})
connection.connect()

// 退出时断开数据库等连接
process.on('exit', () => {
	connection.destroy()
	producer.disconnect()
})

app.get("/", function(req, res) {
    res.send("Hello\n")
});

// 注册员工
app.post("/employees", function(req, res) {
    employee = req.body
	connection.query('INSERT INTO employees values (?, ?, ?)', [employee.id, employee.name, employee.department], function (err) {
    	if (err) {
			if (err.errno == 1062)
				res.status(201).send({msg:"employee exists."}).end()
			else
				res.status(500).send({msg:"server internal error."}).end()
			return;
		}
		res.send({msg:"success"}).end()
		producer.send({ // 发送注册消息
			topic: 'register',
			messages:[
				{key:"register",
					value:JSON.stringify(employee)},
			]
		}).catch(e => console.error(`[example/producer] ${e.message}`, e))
    })
})

app.get("/employees/", function(req, res) {
	connection.query('SELECT * FROM employees', function (err, rows) {
		if (err) {
			res.status(500).send({msg:"server internal error."}).end()
			return
		}
		res.json(rows)
	})
})

app.get("/employees/:id", function(req, res) {
	connection.query('SELECT * FROM employees WHERE id=?', [req.params.id], function (err, rows) {
		if (err) {
			res.status(500).send({msg:"server internal error."}).end()
			return
		}
		res.json(rows)
	})
})

//Todo: 修改部门后是否发送消息
app.put("/employees/:id", function(req, res) {
	employee = req.body
	connection.query('UPDATE employees SET department=? WHERE id=?', [employee.department, req.params.id], function (err,) {
		if (err) {
			res.status(500).send({msg:"server internal error."}).end()
			return
		}
		if(results.changedRows == 0)
            res.send({msg:"user does not exist or department does not change."}).end()
        else {
		    res.send({msg:"success"}).end()
            // producer.send({ // 发送任务消息
            //     topic: 'activate',
            //     messages:[
            //         {key:"activate",
            //             value:req.params.id},
            //     ]
            // }).catch(e => console.error(`[example/producer] ${e.message}`, e))
        }
		res.send({msg:"success"}).end()
	})
})


app.listen(80, function() {
    console.log("start...\n")
})