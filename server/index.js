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

await db.execute(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT)`)

io.on('connection', (socket)=> {
    console.log('new connection')
    socket.on('disconnect', ()=>console.log('connection lost'))

    socket.on('chat message', (msg) => {
        console.log('message:', msg);
        io.emit('chat message', msg);
    });

    socket.on('chat message', async (msg)=>{
        let res
        try{
            res = await db.execute({
                sql: 'INSERT INTO messages (messsage) VALUES (:message)',
                args: {message:msg}
            })
        } catch(e){ console.error(e) 
            return
        }

        io.emit('chat message', msg, res.lastInsertRowid.toString())
    })
});

app.use(logger('dev'))

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.get("/", (req, res) => {
  res.sendFile(process.cwd()+'/client/index.html');
});
