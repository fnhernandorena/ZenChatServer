import express from "express";
import logger from "morgan";
import { Server } from "socket.io";
import { createServer } from "node:http";
import dotenv from 'dotenv'
import  { createClient } from "@libsql/client"

dotenv.config()

const port = process.env.PORT || 3000;
//server starting
const app = express();
const server = createServer(app);
const io = new Server(server);

const db = createClient({
    url: "libsql://romantic-looker-fnhernandorena.turso.io",
    authToken: process.env.DB_TOKEN
})

await db.execute(` CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT,
        username TEXT)`)

io.on('connection', async (socket)=> {
    console.log('new connection')
    socket.on('disconnect', ()=>console.log('connection lost'))

    socket.on('chat message', async (msg)=>{
        let res
        let userName = socket.handshake.auth.userName ?? 'unknown'
        try{
            res = await db.execute({
                sql: 'INSERT INTO messages (message, username) VALUES (:message, :username)',
                args: {message:msg, username: userName}
            })
        } catch(e){ 
            console.error(e) 
            return
        }

        io.emit('chat message', msg, res.lastInsertRowid.toString(), userName)
    })

    if (!socket.recovered){
        try {
            const results = await db.execute({
               sql: `SELECT * FROM messages WHERE id > ?`,
                args: [socket.handshake.auth.serverOffset ?? 0]
            })
            results.rows.forEach(row => socket.emit('chat message', row.message, row.id.toString(), row.username))
        } catch (e) { console.log(e)
             return }
    }
});

app.use(logger('dev'))

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.get("/", (req, res) => {
  res.sendFile(process.cwd()+'/client/index.html');
});
