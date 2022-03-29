const qrCanvas = document.getElementById('qrcode-canvas')
const errorMsg = document.getElementById('error-msg')
const resMsg = document.getElementById('result-msg')
const cameraBtn = document.getElementById('qrcamera-btn')
const resultBorder = document.getElementById('resultborder');
const usrName = document.getElementById('userdata-name');
const usrDob = document.getElementById('userdata-dob');



// camera scan setup
var html5QrcodeScanner = new Html5Qrcode(/* element id */ "reader");
var config = { fps: 10, qrbox: { width: document.getElementById('reader').clientWidth * 0.75, height: document.getElementById('reader').clientHeigth * 0.75 } };

var qrEngine;
var tab = "home";
var lang = ita;
var external={};
var valid;

async function loadExternal(){
    external.validationClock = DCC.formatDate();
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
        console.error("Cannot fetch value sets: " + error);
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
        console.error("Cannot fetch rules: " + error);
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
        console.error("Cannot fetch algorithm list: " + error);
    });

    await fetch('./data/blueprint.json')
    .then(response => {
        if (response.ok)
            return response.json();
        else
            throw new Error('Fetching error');
    })
    .then(data => {
        external.blueprint = data;
    })
    .catch(error => {
        console.error("Cannot fetch blueprint: " + error);
    });

    await fetch('./data/certficateList.json')
    .then(response => {
        if (response.ok)
            return response.json();
        else
            throw new Error('Fetching error');
    })
    .then(data => {
        external.certificate = data;
    })
    .catch(error => {
        console.error("Cannot fetch value sets: " + error);
    });
}
// on load: load localization and set up qrscanner engine
$(document).ready(async function () {
    load_text();
    loadExternal();
});


// camera button listener to activate the camera scanner
cameraBtn.addEventListener("click", function (element) {
    resetPage();
    if (cameraBtn.className === "btn btn-primary") {
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
    cameraBtn.className = "btn btn-primary";
    cameraBtn.value = lang["home"]["qrcamera-btn"]
    try { html5QrcodeScanner.stop(); }
    catch (error) { }
}

// verify function called if the file scan was ok
async function verify(result) {
    // decode of cose content into dcc variable
    DCC.fromRaw(result, external).then(dcc => {
            var d = new Date(dcc.date_of_birth)
            var dob = ('0'+d.getUTCDate()).slice(-2) + '/' + ('0'+(d.getUTCMonth()+1)).slice(-2) + '/' + d.getUTCFullYear();
            areRulesValid(dcc).then( result =>{
                if(result) certValid(`${dcc.name} ${dcc.surname}`, dob); 
                else certNotValid(`${dcc.name} ${dcc.surname}`, dob); 
            }).catch(err => {
                certNotValid(`N/A`, `N/A`);
                console.error(err)
            });;
        })
        .catch(err => {
            certNotValid(`N/A`, `N/A`);
            console.error(err)
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
    valid=0;
    load_text();
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
    valid=1;
    load_text();
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
    $("#qrcamera-btn").val(lang["home"]["qrcamera-btn"]);
    if (valid)
        $('#contentresult').html(lang["home"]["valid"])
    else
        $('#contentresult').html(lang["home"]["not_valid"])
    // faq

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