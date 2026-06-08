const { startServer } = require("./server");

startServer({
  port: Number(process.env.PORT || 3000),
  hostname: "0.0.0.0",
});