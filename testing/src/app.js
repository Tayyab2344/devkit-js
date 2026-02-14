
import express from "express"

const app = express()

app.get("/", (req, res) => {
  res.send("Hello from DevKit Express")
})

export default app
