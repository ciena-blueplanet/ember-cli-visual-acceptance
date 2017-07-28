/* eslint-disable max-len */
const electron = require('electron')
const app = electron.app // Module to control application life.
const BrowserWindow = electron.BrowserWindow // Module to create native browser window.
const ipcMain = electron.ipcMain
const timeoutFromResize = 1500
var url = process.argv[2]

// var url = process.argv[2]
// Report crashes to our server.
// electron.crashReporter.start();
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // if (process.platform !== 'darwin') {
  app.quit()
  // }
})

function sendImage (win, image) {
  win.webContents.send('return-image-event', {
    image: image
  })
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 800,
    offscreen: true,
    show: false,
    'enable-larger-than-screen': true,
    useContentSize: true
  })
  console.log('Setting ipcMain')
  mainWindow.webContents.executeJavaScript(`
  const ipcRenderer = window.nodeRequire('electron').ipcRenderer
  Testem.afterTests(
    // Asynchronously
    function (config, data, callback) {
      callback(null)
      // Set time to wait for callback to finish its work. Then close launcher (Issue Testem: fails to close custom launcher on Linux) https://github.com/testem/testem/issues/915
      setTimeout(function (params) {
        ipcRenderer.send('exit-event', {
          exit: true
        })
      }, 2000)
      // Set time to wait for callback to finish its work. Then close launcher (Issue Testem: fails to close custom launcher on Linux) https://github.com/testem/testem/issues/915
    }
  )
  `)
  ipcMain.on('capture-event', function (event, data) {
    mainWindow.webContents.executeJavaScript(
      "[document.getElementById('ember-testing-container').scrollWidth, document.getElementById('ember-testing-container').scrollHeight]",
      false, result => {
        mainWindow.setContentSize(result[0] + 200, result[1] + 200)

        setTimeout(() => {
          mainWindow.webContents.executeJavaScript(`[window.scrollTo(0,0), JSON.stringify(document.getElementById('${data.targetId}').getBoundingClientRect(), ["top", "left", "width", 
          "height"])]`, false, res => {
            let rect = JSON.parse(res[1])
            var clip = {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height
            }

            mainWindow.capturePage(clip, function (imageResult) {
              // fs.writeFileSync('/Users/ewhite/workspace/ember-cli-visual-acceptance/electron-images/' + uuidv4() + '-image.png', imageResult.toPNG())
              var image = Buffer.from(imageResult.toPNG()).toString('base64')
              sendImage(mainWindow, image)
            })
          })
        }, timeoutFromResize)
      }
    )
  })

  ipcMain.on('exit-event', function () {
    app.exit()
  })

  // and load the index.html of the app.
  mainWindow.loadURL(url)

  // Open the DevTools.
  // mainWindow.webContents.openDevTools({mode: 'detach'})

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
})

process.on('SIGTERM', function () {
  mainWindow = null
})
