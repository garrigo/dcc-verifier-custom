const { app, BrowserWindow, nativeTheme, session} = require("electron");
const https = require('https');
const fs = require('fs');
const path = require('path');
//simulate DCC gateway/issuer in local
const GATEWAY_URL = "192.168.1.111";
const LocalStorage = require('node-localstorage').LocalStorage;
var localStorage = new LocalStorage(path.join(__dirname, "/public/data"));

async function updateList(){
    var date = new Date().toLocaleDateString();
    if (localStorage.getItem('upDate') === date)
        return;
    downloadList(GATEWAY_URL, "/certificateList", "/public/data/certficateList.json");
    downloadList(GATEWAY_URL, "/valueSets", "/public/data/valueSets.json");
    downloadList(GATEWAY_URL, "/rules", "/public/data/rules.json");
    downloadList(GATEWAY_URL, "/algorithmList", "/public/data/algorithmList.json");    
    localStorage.setItem('upDate', date);
}

async function downloadList(url, urlPath, fsPath){   

    const options = {
        hostname: url,
        port: 5000,
        path: urlPath,
        method: 'GET',
        //WARNING: certificates are not checked in order to test with self signed certificates
        rejectUnauthorized: false
    }
    let result;
    const req = https.request(options, res=>{
        res.on('data', d =>{
            fs.writeFile(path.join(__dirname, fsPath), d, function(err){
            });
        })
    })
    req.end();
}

// create new application window
function createWindow() {
    const win = new BrowserWindow({
        // width: 590,
        // height: 770,
        // titleBarStyle: 'hidden',
        // titleBarOverlay: {
        //     color: '#0d6efd',
        //     symbolColor: '#000000'
        // }
    })

    win.menuBarVisible = false
    // set color mode to follow system settings
    nativeTheme.themeSource = 'system'
    // debug console
    // win.webContents.openDevTools()
    win.loadFile(path.join(__dirname, '/public/index.html'))

}

// on activation
app.whenReady().then(() => {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            // buggy style-src csp, bad 'unsafe-inline' needed in order to load CSS
            // 'Content-Security-Policy-Report-Only', "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; frame-src 'self'"
            'Content-Security-Policy': ["\
            default-src 'self'; \
            script-src 'self' \
            'sha256-H+K7U5CnXl1h5ywQfKtSj8PCmoN9aaq30gDh27Xc0jk=' \
            'sha384-ka7Sk0Gln4gmtz2MlQnikT1wXgYsOg+OMhuP+IlRH9sENBO0LRn5q+8nbTov4+1p' \
            'sha384-wfSDF2E50Y2D1uUdj0O3uMBJnjuUD4Ih7YwaYd1iqfktj0Uod8GCExl3Og8ifwB6'; \
            style-src  'self' 'unsafe-inline'; \
            style-src-elem * ; \
            font-src 'self'; img-src 'self' blob:; frame-src 'self'"]
          }
        })
      })
    createWindow()
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
    updateList();
})

// app closure
app.on('window-all-closed', () => {
    // on macos app should be closed only manually
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
