// Modules to control application life and create native browser window
const { app, BrowserWindow,ipcMain } = require('electron')
const path = require('node:path')
const net = require('net');

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    // 处理和退出逻辑...
  });
  // and load the index.html of the app.
  mainWindow.loadFile('app/index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}
let connectionCounter = 0;
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()
 

  // app.disableHardwareAcceleration(false);
  var server = net.createServer((socket) => {
    socket.setTimeout(160000); // 1-minute timeout
    console.log('客户端与服务器端连接已经建立');

    connectionCounter++;
    
    socket.id = `socket-${connectionCounter}`;
    console.log(socket.id)

    socket.on("data", (data) => {
      
      try{
    
        const message = data.toString();
        unPacker(message,socket);
      }catch(e)
      {
        console.log(e)
      }
 
    })
    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });
    socket.on('timeout', () => {
      console.log('Socket timed out, closing connection');
      socket.end();
    });
    socket.on('close', (e) => {
      console.log('Connection closed',e);
    });
  })
  server.listen(8222, () => {
    console.log('TCP 服务器正在监听端口 8222');
  });

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
let bufferSum = "";

function unPacker(buffer,socket) {
  //console.log(buffer)
  // 模拟的正则表达式
  const regex = /<[A-Z]+>\|[0-9]+\|.*>/;

  // 将输入 buffer 按 "SUFFIX" 分割
  const separator = 'SUFFIX';
  bufferSum += buffer

  // 你的处理逻辑可以放在这里
  if (bufferSum.indexOf('<EOF>') != -1) {
    const fileBytes = bufferSum.trim().split(separator);
    //console.log("message:" + bufferSum)
    for (let filebyte of fileBytes) {
      if (filebyte.trim().length > 0) {
        try {
          // 检查是否包含 <EOF>

          const len = filebyte.length;
          var tagEof = filebyte.substring(len - 5);
          if (tagEof !== "<EOF>") {
            continue
          }


          const whatsTag = filebyte.split("[VERI]")[0]
          const content = filebyte.substring(0, len - 5)
          // 假设有 `tmp_form` 对象来处理数据
          dataProcess(whatsTag, content,socket);

        } catch (error) {
          // 捕获并忽略错误
          console.error(error);
        }
      }

    }

  }
}
function dataProcess(tag, databuff,socket) {

  console.log(tag)
  switch (tag.split("|")[0]) {
    case "<MYIP>":
      const datas = databuff.split("[VERI]");
      datas.push(socket.address().address);
      datas.push(socket.id);
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('online', datas);
      });
      try{
        console.log("发送myupdate");
       // socket.write(MyDataPacker("MYUPDATE","ECHO",null));

      }catch(e)
      {
        console.log(e)
      }
    default:{
     //console.log(tag)
    }
  }

}

function stringToByteArray(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}


function MyDataPacker(tag,message,extraInfos)
{
  var ms= "";
  ms+="<"+tag+">|"+message.length+"|"+extraInfos+">"+message+"<EOF>SUFFIX";
  const buffer = Buffer.from(ms, 'utf-8');
  //console.log(buffer)；
  return buffer;
}

