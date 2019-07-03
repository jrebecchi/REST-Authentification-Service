//Adapt to your server config
const http = require('http');
const server = http.createServer(app);
server.listen(process.env.PORT || 3000, process.env.IP || "127.0.0.1", function(){
  const addr = server.address();
  console.log("Server listening at", addr.address + ":" + addr.port);
});