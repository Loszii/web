//to do: make module, maybe memorize song and let user pick song while current still playing aka reload after
//next visualizer a wave that moves fast freq to the left and writes new ones from right to left

const canvas = document.getElementById("canvas1");
const container = document.getElementById("container");
const file = document.getElementById("fileupload");
const ctx = canvas.getContext("2d"); //gets a canvas context object and sets the context to 2d
let audioSource;
let analyzer;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let bufferLength;
const audio1 = document.getElementById("audio1");
const timeDisplay = document.getElementById("timeDisplay"); // 0:00 / 0:00

//buttons
const barButton = document.getElementById("barButton");
const circleButton = document.getElementById("circleButton");
const lineButton = document.getElementById("lineButton");
const squareButton = document.getElementById("squareButton");
const pauseButton = document.getElementById("pauseButton");
const fileButton = document.getElementById("fileLabel");
const titleText = document.getElementById("titleText");
const changeButton = document.getElementById("changeButton");

//sliders
const redSlider = document.getElementById("redSlider");
const greenSlider = document.getElementById("greenSlider");
const blueSlider = document.getElementById("blueSlider");
const timeSlider = document.getElementById("timeSlider");

//coloring and memorization
let visMode = 0;
if ("visMode" in sessionStorage) {
    visMode = sessionStorage.getItem("visMode");
}
let red = redSlider.valueAsNumber;
if ("red" in sessionStorage) {
    red = sessionStorage.getItem("red");
    redSlider.value = sessionStorage.getItem("red");
}
let green = greenSlider.valueAsNumber;
if ("green" in sessionStorage) {
    green = sessionStorage.getItem("green");
    greenSlider.value = sessionStorage.getItem("green");
}
let blue = blueSlider.valueAsNumber;
if ("blue" in sessionStorage) {
    blue = sessionStorage.getItem("blue");
    blueSlider.value = sessionStorage.getItem("blue");
}

//applying previous colors
changeColor();

//custom audio controls
pauseButton.addEventListener("click", function() {
    if (audio1.paused) {
        audio1.play();
        pauseButton.innerHTML = "| |";
    } else {
        audio1.pause();
        pauseButton.innerHTML = "&#9658;";
    }
});
timeSlider.addEventListener("input", function(){
    audio1.currentTime = timeSlider.valueAsNumber;
});


file.addEventListener("change", function(){
    //playing audio from file
    const files = this.files;
    audio1.src = URL.createObjectURL(files[0]);
    audio1.load();
    audio1.onloadedmetadata = function(){ //setting timeSlider max
        timeSlider.max = audio1.duration;
    }
    audio1.play();

    //below uses the built into browser web audio api
    const audioCtx = new AudioContext(); //context, just like with canvas, relates to an object with all relevant information regarding audio
    audioSource = audioCtx.createMediaElementSource(audio1); //sets audio 1 to source
    analyzer = audioCtx.createAnalyser(); //makes an object to analyze sound data
    audioSource.connect(analyzer); // connects our analyzer object and audio source object
    analyzer.connect(audioCtx.destination); //connects our audio back from analyzer to out speakers
    analyzer.fftSize = 1024; // number of sample

    //only want 20 out of 24 hz freq since that is human hearing range
    bufferLength = Math.round(analyzer.frequencyBinCount * (20/24)); // always half of fft size and number of bars
    const dataArray = new Uint8Array(bufferLength); // array of unsigned integers up to 2^8, will be of length bufferLength

    //for drawLines()
    xTracker = new Array(bufferLength);
    initXTracker();

    //saving song name and removing files
    const songName = getSongName(files[0].name);
    const text = document.createTextNode(songName);
    titleText.appendChild(text);
    fileButton.remove(); //removing file choice
    //making elements appear
    titleText.style.display = "inline-block";
    changeButton.style.display = "inline-block"
    timeSlider.style.display = "inline-block";
    timeDisplay.style.display = "inline-block";
    pauseButton.style.display = "inline-block";
    changeColor(); //update colors now that visible

    changeButton.addEventListener("click", function(){
        document.location.reload();
    });

    //animation loop
    function animate(){
        analyzer.getByteFrequencyData(dataArray); // sets each element in our array to a freq
        ctx.clearRect(0, 0, canvas.width, canvas.height); //clears the entire canvas
        drawData(dataArray);
        timeSlider.valueAsNumber = audio1.currentTime;
        timeDisplay.innerHTML = getMinutes(timeSlider.valueAsNumber) + "/" + getMinutes(timeSlider.max);
        requestAnimationFrame(animate);
    }
    animate();
});

//modes
barButton.addEventListener("click", function(){
    visMode = 0;
    sessionStorage.setItem("visMode", 0);
});
circleButton.addEventListener("click", function(){
    visMode = 1;
    sessionStorage.setItem("visMode", 1);
});
lineButton.addEventListener("click", function(){
    visMode = 2;
    sessionStorage.setItem("visMode", 2);
});
squareButton.addEventListener("click", function(){
    visMode = 3;
    sessionStorage.setItem("visMode", 3)
});

//sliders and coloring
redSlider.addEventListener("input", function(){
    red = redSlider.valueAsNumber;
    changeColor();
});
greenSlider.addEventListener("input", function(){
    green = greenSlider.valueAsNumber;
    changeColor();
});
blueSlider.addEventListener("input", function(){
    blue = blueSlider.valueAsNumber;
    changeColor();
});

function changeColor(){
    color = "rgb(" + red + ", " + green + ", " + blue + ")";
    barButton.style = "border-color: " + color + ";"
    circleButton.style = "border-color: " + color + ";";
    lineButton.style = "border-color: " + color + ";";
    squareButton.style = "border-color: " + color + ";";
    fileButton.style = "text-decoration: underline " + color + "; text-shadow: 3px 2px 4px " + color + ";";
    if (changeButton.style.display == "inline-block") {
        changeButton.style = "display: inline-block; border-color: " + color + ";";
        titleText.style = "display: inline-block; text-decoration: underline " + color + "; text-shadow: 3px 2px 4px " + color + ";";
        pauseButton.style = "display: inline-block; border-color: " + color + ";";
        timeSlider.style = "display: inline-block; accent-color: " + color + "; filter: drop-shadow(0px 0px 4px " + color + ");";
    }
    sessionStorage.setItem("red", red);
    sessionStorage.setItem("green", green);
    sessionStorage.setItem("blue", blue);
}

//draw algorithms
function drawData(dataArray){
    if (visMode == 0) {
        drawBars(dataArray);
    } else if (visMode == 1) {
        drawCircle(dataArray);
    } else if (visMode == 2) {
        drawLines(dataArray);
    } else {
        drawSquares(dataArray);
    }
}

function drawCircle(dataArray){
    const rotations = 10; //not exactly ten since bufferLength equation is irrational number
    const barWidth = 5;
    ctx.save(); //saves canvas
    ctx.translate(canvas.width / 2, canvas.height / 2); //setting origin to middle for rotation
    for (let i = 0; i < bufferLength; i++) {
        let heightScale = (1.75 - (0.003 * i));
        let darkScale = 0.5 * i; //make color slowly darker
        ctx.fillStyle = "black";
        ctx.fillRect(0, dataArray[i] * heightScale, barWidth, 5);
        ctx.fillStyle = "rgb(" + (red - darkScale) + "," + (green - darkScale) + "," + (blue - darkScale) + ")";
        ctx.fillRect(0, 0, barWidth, dataArray[i] * heightScale); // making the scale smaller as i gets bigger
        ctx.rotate(rotations * (2 * Math.PI / bufferLength));
    }
    ctx.restore(); //loads origin back so can clear
}

function drawBars(dataArray){
    const barWidth = ((canvas.width/2) / bufferLength); //divided by 2 for mirrored image
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] * 2;
        if (barHeight > 0) {
            ctx.fillStyle = "rgb(" + red + "," + green + "," + blue + ")";
            ctx.fillRect((canvas.width / 2) - x, canvas.height - barHeight - 15, barWidth, 15);
            ctx.fillStyle = "rgb(" + red*0.5 + "," + green*0.5 + "," + blue*0.5 + ")";
            ctx.fillRect((canvas.width / 2) - x, canvas.height - barHeight, barWidth, barHeight);
        }
        x += barWidth;
    }
    for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] * 2;
        if (barHeight > 0) {
            ctx.fillStyle = "rgb(" + red + "," + green + "," + blue + ")";
            ctx.fillRect(x, canvas.height - barHeight - 15, barWidth, 15);
            ctx.fillStyle = "rgb(" + red*0.5 + "," + green*0.5 + "," + blue*0.5 + ")";
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        }
        x += barWidth;
    }
}

function initXTracker(){
    for (let i = 0; i < bufferLength; i++) {
        xTracker[i] = 0;
    }
}

function drawLines(dataArray){
    const scale = 0.025; //scale of speed
    const barHeight = canvas.height / bufferLength;
    let y = 115;
    let avg = getAverage(dataArray);
    ctx.fillStyle = "rgb(" + red + "," + green + "," + blue + ")";
    for (let i = 0; i < bufferLength; i++) { //to put back on screen
        let velocity = scale * avg * dataArray[i]; //width of trail and value used for speed increment
        if (xTracker[i] - velocity > canvas.width) { //once edge of trail is off screen reset
            xTracker[i] = -0.25 * velocity; //reset based on trail length
        }
        if (velocity > 0) { //remove non moving lines
            ctx.fillRect(xTracker[i], y, -0.75 * velocity, barHeight); //trail 3/4 of velocity
            xTracker[i] += velocity; //movement
        }
        y += barHeight;
    }
}

function drawSquares(dataArray){
    const scale = 0.015;
    const y = 30;
    let avg = getAverage(dataArray);
    ctx.lineWidth = 0.035;
    ctx.strokeStyle = "rgb(" + red + "," + green + "," + blue + ")";
    for (let i = 0.5; i < 10; i++) {
        drawSquare(dataArray, i/10, 4/10,scale, y, avg);
        drawSquare(dataArray, i/10, 6/10,scale, y, avg);
    }
    ctx.stroke();
}

function drawSquare(dataArray, xPos, yPos, scale, y, avg){
    ctx.save();
    ctx.translate(canvas.width * xPos, canvas.height *yPos + y);
    for (let i = 0; i < bufferLength; i++) {
        let squareLength = avg * scale * dataArray[i];
        ctx.strokeRect(-1 * squareLength / 2, -1 * squareLength / 2, squareLength, squareLength);
    }
    ctx.restore();
}

function getAverage(array){
    let sum = 0;
    let length = array.length;
    for (let i = 0; i < length; i++) {
        sum += array[i];
    }
    return sum / length;
}

function getSongName(name){
    if (name.length > 25) {
        name = name.slice(0, 25) + "...";
    }
    return name;
}

function getMinutes(seconds){
    let mins = (seconds / 60);
    mins = mins.toString().split(".")[0];
    let remainder = seconds % 60;
    remainder = remainder.toString().split(".")[0]
    if (remainder.length < 2) {
        remainder = "0" + remainder;
    }
    return mins + ":" + remainder;
}