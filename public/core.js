const fileSelector = document.getElementById('file-selector')
const qrCanvas = document.getElementById('qrcode-canvas')
const errorMsg = document.getElementById('error-msg')
const resMsg = document.getElementById('result-msg')
const cameraBtn = document.getElementById('qrcamera-btn')
const resultBorder = document.getElementById('resultborder');
const usrName = document.getElementById('userdata-name');
const usrDob = document.getElementById('userdata-dob');


import QrScanner from './lib/qr-scanner.js';
QrScanner.WORKER_PATH = './lib/qr-scanner-worker.min.js';

// camera scan setup
var html5QrcodeScanner = new Html5Qrcode(/* element id */ "reader");
var config = { fps: 10, qrbox: { width: document.getElementById('reader').clientWidth * 0.75, height: document.getElementById('reader').clientHeigth * 0.75 } };

var qrEngine;
var tab = "home";
var lang = ita;
var qr_text = "B10KI9MU0/WN1:1EFG+U4HLVR31B7KF9GA8AAESFTG7YC UU2%N9DAXZA3TAXEF*5MC7L.V6K0DCCSQVS-WN 8N53W1/S6.0DRKLB0GTCEOA.O0TO6E8GRB85IAU09I-0XB9-M8 Y9 N0DQN100100100JB0.O0T*3%2"
var external={};

async function loadExternal(){
    var validationClock = DCC.formatDate();
    external.validationClock = validationClock;
    var rules = [];
    await fetch('./data/valueSets.json')
    .then(response => {
        if (response.ok)
            return response.json();
        else
            throw new Error('Fetching error');
    })
    .then(data => {
        external.valueSets = data;
    })
    .catch(error => {
        document.getElementById('errborder').style.display = "flex";
        errorMsg.className = "alert alert-danger";
        errorMsg.innerHTML = "Cannot fetch rules value sets: " + error;
    });

    await fetch('./data/rules.json')
    .then(response => {
        if (response.ok)
            return response.json();
        else
            throw new Error('Fetching error');
    })
    .then(data => {
        for (let rule in data.rules)
            rules.push(Rule.fromJSON(data.rules[rule], {}));
        external.rules = rules;
    })
    .catch(error => {
        document.getElementById('errborder').style.display = "flex";
        errorMsg.className = "alert alert-danger";
        errorMsg.innerHTML = "Cannot fetch rules value sets: " + error;
    });
    await fetch('./data/algorithmList.json')
    .then(response => {
        if (response.ok)
            return response.json();
        else
            throw new Error('Fetching error');
    })
    .then(data => {
        external.algorithm = data;
    })
    .catch(error => {
        document.getElementById('errborder').style.display = "flex";
        errorMsg.className = "alert alert-danger";
        errorMsg.innerHTML = "Cannot fetch rules value sets: " + error;
    });
}
// on load: load localization and set up qrscanner engine
$(document).ready(async function () {
    load_text();
    qrEngine = QrScanner.createQrEngine();  
    await loadExternal();
    verify(qr_text);
});

// listener for change on file selector, when a new qr is inserted try to decode it
fileSelector.addEventListener('change', event => {
    var file = fileSelector.files[0];
    if (!file) return;
    resetPage();
    // scan qr from image
    QrScanner.scanImage(file, null, qrEngine)
        .then(result => {
            verify(result);
        })
        .catch(e => error(e || 'No QR code found.'));
});


fileSelector.addEventListener("click", event => {
    revertScan();
});

// camera button listener to activate the camera scanner
cameraBtn.addEventListener("click", function (element) {
    resetPage();
    if (cameraBtn.className === "btn btn-success") {
        html5QrcodeScanner.start({ facingMode: "environment" }, config, onScanSuccess)
            .then(success => {
                cameraBtn.className = "btn btn-danger";
                cameraBtn.value = lang["home"]["stop-scanner"];
            })
            .catch(err => {
                error("No camera was found.");
            });
    }
    else
        revertScan();
});

// when a qr is successfully scanned
async function onScanSuccess(decodedText) {
    revertScan();
    verify(decodedText);
}

// stop camera scanning
function revertScan() {
    cameraBtn.className = "btn btn-success";
    cameraBtn.value = lang["home"]["qrcamera-btn"]
    try { html5QrcodeScanner.stop(); }
    catch (error) { }
}

// verify function called if the file scan was ok
async function verify(result) {
    // decode of cose content into dcc variable
    DCC.fromRaw(result, external).then(dcc => {
        fetch('./data/certficateList.json')
            .then(response => {
                if (response.ok)
                    return response.json();
                else
                    throw new Error('Fetching error');
            })
            .then(data => {
                var pk_raw;       
                if (dcc.algo === '0'){
                    pk_raw = data["ECDSA"][dcc.kid]["publicKeyPem"];
                }   
                else if (dcc.algo === '1')
                    pk_raw = data["RSA"][dcc.kid]["publicKeyPem"];
                var pk = "-----BEGIN PUBLIC KEY-----\n"+pk_raw+"\n-----END PUBLIC KEY-----";
                window.verify(dcc.payload, dcc.signature, pk, dcc.algo)
                .then(result =>{
                    var d = new Date(dcc.birth*1000)
                    var dob = ('0'+d.getUTCDate()).slice(-2) + '/' + ('0'+(d.getUTCMonth()+1)).slice(-2) + '/' + d.getUTCFullYear();
                    if(result){
                        areRulesValid(dcc).then( result =>{
                            if(result) certValid(`${dcc.name} ${dcc.surname}`, dob);
                            else certNotValid(`${dcc.name} ${dcc.surname}`, dob);
                        });
                    }
                    else{
                        certNotValid(`${dcc.name} ${dcc.surname}`, dob);
                    }
                });
            });
        })
        .catch(err => {
            certNotValid(`N/A`, `N/A`);
        });


}

// check if dcc follows set of rules
const areRulesValid = async function (dcc) {
    // certificate cannot be verified if all rules haven't been fetched
    
    for (const rule of external.rules) {
        // handling exception of when the payload has valid structure but data of wrong type
        // or anything that doesn't work with the rules
        try {
            var rule_valid = await rule.evaluateDCC(dcc, external);
            // if (rule_valid)
            //     console.log(`Rule ${rule.identifier} VALID: ${rule.getDescription()}`);
            // else
            //     console.log(`Rule ${rule.identifier} NOT VALID: ${rule.getDescription()}`);
            // end loop when a rule is not respected
            if (!rule_valid) return false;
            
        } catch (error) {
            throw new Error('Rules evaluation error');
        }
    }
    return true;
}

// fill result div with error colors and result values
const certNotValid = function (name, dob) {
    document.getElementById('contentresult').innerHTML = "Certificate is NOT VALID.";
    resultBorder.style.display = "flex";
    resultBorder.style.color = "red";
    resultBorder.classList.remove("bg-success");
    resultBorder.classList.remove("border-success");
    resultBorder.classList.add("border-danger");
    resultBorder.classList.add("bg-danger");
    usrName.innerHTML = name;
    usrDob.innerHTML = dob;
}

// fill result div with success colors and result values
const certValid = function (name, dob) {
    document.getElementById('contentresult').innerHTML = "Certificate is VALID.";
    resultBorder.classList.remove("bg-danger");
    resultBorder.classList.remove("border-danger");
    resultBorder.classList.add("border-success");
    resultBorder.classList.add("bg-success");
    resultBorder.style.display = "flex";
    usrName.innerHTML = name;
    usrDob.innerHTML = dob;
}



// faq top nav click
document.getElementById("nav-faq-btn").addEventListener("click", function () {
    if (tab === "home") {
        $('#nav-faq-btn').removeAttr("href");
        $('#nav-home-btn').attr('href', '#');
        document.getElementById("main-container").style.display = "none";
        document.getElementById("faq-container").style.display = "table";
        document.getElementById("nav-title").innerHTML = lang["faq"]["nav-title"];
        // stop camera scanning if active
        revertScan();
        tab = "faq";
    }

}, false);

// home top nav click
document.getElementById("nav-home-btn").addEventListener("click", function () {
    if (tab === "faq") {
        $('#nav-home-btn').removeAttr("href");
        $('#nav-faq-btn').attr('href', '#');
        document.getElementById("main-container").style.display = "table";
        document.getElementById("faq-container").style.display = "none";
        document.getElementById("nav-title").innerHTML = lang["home"]["nav-title"];
        tab = "home";
    }
}, false);

// load text strings from json of the selected language
function load_text() {
    // home
    if (tab === "home")
        $('#nav-title').text(lang["home"]["nav-title"]);
    else
        $('#nav-title').text(lang["faq"]["nav-title"]);
    $('#main-title').html(lang["home"]["main-title"]);
    $('#file-selector-label').html(lang["home"]["file-selector"]);
    $("#qrcamera-btn").val(lang["home"]["qrcamera-btn"]);
    $("#radio-label-eu").html(lang["home"]["radio-eu"]);
    $("#radio-label-it").html(lang["home"]["radio-it"]);
    if (resMsg.innerHTML)
        resMsg.innerHTML = lang["home"]["success-msg"];
    // faq
    $('.question').text(lang["faq"]["question"]);
    $('.answer').text(lang["faq"]["answer"]);
    $('.adv-detail').text(lang["faq"]["adv-detail"]);
    $('#question1').html(lang["faq"]["question1"]);
    $('#answer1').html(lang["faq"]["answer1"]);
    $('#question2').html(lang["faq"]["question2"]);
    $('#answer2').html(lang["faq"]["answer2"]);
    $('#question3').html(lang["faq"]["question3"]);
    $('#answer3').html(lang["faq"]["answer3"]);
    $('#question4').html(lang["faq"]["question4"]);
    $('#answer4').html(lang["faq"]["answer4"]);
    $('#question5').html(lang["faq"]["question5"]);
    $('#answer5').html(lang["faq"]["answer5"]);
    $('#question6').html(lang["faq"]["question6"]);
    $('#answer6').html(lang["faq"]["answer6"]);
    $('#question7').html(lang["faq"]["question7"]);
    $('#answer7').html(lang["faq"]["answer7"]);
    //$('#question8').html(lang["faq"]["question8"]);
    //$('#answer8').html(lang["faq"]["answer8"]);
    $('#adv-ans3').html(lang["faq"]["adv-ans3"]);
    $('#adv-ans3-file-sel1').html(lang["faq"]["adv-ans3-file-sel1"]);
    $('#adv-ans3-file-sel2').html(lang["faq"]["adv-ans3-file-sel2"]);
    $('#adv-ans3-file-sel3').html(lang["faq"]["adv-ans3-file-sel3"]);
    $('#adv-ans3-qr-scan1').html(lang["faq"]["adv-ans3-qr-scan1"]);
    $('#adv-ans3-qr-scan2').html(lang["faq"]["adv-ans3-qr-scan2"]);
    $('#adv-ans3-qr-gen1').html(lang["faq"]["adv-ans3-qr-gen1"]);
    $('#adv-ans3-qr-gen2').html(lang["faq"]["adv-ans3-qr-gen2"]);
    $('#adv-ans5').html(lang["faq"]["adv-ans5"]);

    // listener for dinamically generated faq link in advanced settings
    // document.getElementById("setting-faq-btn").addEventListener("click", function () {
    //     document.getElementById("nav-faq-btn").click();
    // }, false);
}

// italian language on click
$('#ita').click(function () {
    // change language to italian
    lang = ita;
    load_text();
    $('#ita').removeAttr("href");
    $('#eng').attr('href', '#');
});

// english language on click
$('#eng').click(function () {
    // change language to english
    lang = eng;
    load_text();
    $('#eng').removeAttr("href");
    $('#ita').attr('href', '#');
});

// flush errors and previous prints
function resetPage() {
    resultBorder.style.display = "none";
    errorMsg.innerHTML = "";
    errorMsg.className = "";
    resMsg.innerHTML = "";
    resMsg.className = "";
    qrCanvas.innerHTML = "";
}

// error print
function error(msg) {
    errorMsg.className = "alert alert-danger";
    errorMsg.innerHTML = msg;
}