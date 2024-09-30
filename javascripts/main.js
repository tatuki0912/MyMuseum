function main() {
    const canvas = setupCanvas();
    gl = initWebGL(canvas);
    
    initShaders(gl);
    initShadowShaders(gl);
    initBuffers(gl);
    initTextures(gl);
    initShadowFramebuffer(gl);
    
    setupEventListeners();
    // initial position
    cameraPosition = [0, 1.7, 5];
    cameraRotation = [0, 0];

    requestAnimationFrame(gameLoop);
}

function gameLoop() {
    updateCamera();
    draw();
    requestAnimationFrame(gameLoop);
}

function setupCanvas() {
    const canvas = document.getElementById('museumCanvas');
    if (mobile) {
        canvas.width = window.innerHeight;
        canvas.height = window.innerWidth;
        canvas.style.transform = 'rotate(-90deg)';
        canvas.style.transformOrigin = 'top left';
        canvas.style.position = 'absolute';
        canvas.style.top = '100%';
    } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    return canvas;
}

function showImagePopup() {
    closeAllPopup()
    document.getElementById('imagePopup').style.display = 'block';
    document.exitPointerLock();
}

function closeImagePopup() {
    document.getElementById('imagePopup').style.display = 'none';
    gl.canvas.requestPointerLock();
}
function closeAllPopup(){
    document.querySelectorAll('.popup').forEach((element) => {
        element.style.display = 'none'
    })
}
function setImage() {
    const imageInput = document.getElementById('imageInput');
    const urlInput = document.getElementById('imageURLInput');

    if (imageInput.files.length > 0) {
        loadTextureFromFile(gl, imageInput.files[0], (texture) => {
            objectTexture = texture;
            createObject();
            closeImagePopup();
            imageInput.value = ''
        });
    } else if (urlInput.value) {
        loadTexture(gl, urlInput.value, (texture) => {
            objectTexture = texture;
            createObject();
            closeImagePopup();
        });
    }
}
function ImageToBase64(img) {
    var canvas = document.createElement('canvas');
    canvas.width  = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
}
function setupEventListeners() {
    document.addEventListener('keydown', (e) => keys[e.code] = true);
    document.addEventListener('keyup', (e) => keys[e.code] = false);
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === null) {
            if(keys['rightClick']) return
            settingPopup.style.display = 'block'
        }else{
            closeAllPopup()
        }
    });
    // icons
    settingIcon.addEventListener('click', () => {
        let displayTemp = settingPopup.style.display
        closeAllPopup()
        settingPopup.style.display = displayTemp == 'block' ? 'none' : 'block';
    });
    infoIcon.addEventListener('click', () =>{
        let displayTemp = tutorial.style.display
        closeAllPopup()
        tutorial.style.display = displayTemp == 'block' ? 'none' : 'block';
    })
    // settingPopup
    document.getElementById('closeSettingsBtn').addEventListener('click', () => {
        settingPopup.style.display = 'none';
        gl.canvas.requestPointerLock()
    });
    saveWorldBtn.addEventListener('click', (e) => {
        let saveobjects = [];
        for(let object of objects){
            try {
                object.texture.image = ImageToBase64(object.texture.image)
            } catch (e) {
                console.log(e)
            }
            saveobjects.push(objects)
        }
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(saveobjects));
        var dlAnchorElem = document.getElementById('downloadAnchor');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "myMuseum.json");
        dlAnchorElem.click();
    })
    const reader = new FileReader();
    loadWorldBtn.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            reader.readAsText(file);
        }
    })
    reader.onload = function(e) {
        var loadObjects = (JSON.parse(e.target.result))[0];
        var loadedObjects = [];
        for(object of loadObjects){
            object.texture = loadTexture(gl, object.texture.image, object.texture.repeat, object.texture.scaleS, object.texture.scaleT)
            loadedObjects.push(object)
        }
        objects = loadObjects
    };
    // tutorialPopup
    document.querySelectorAll('.close-tutorial-popup').forEach( (e) => {
        e.addEventListener('click', () => {
            tutorial.style.display = 'none'
        })
    })
    // imagePopup
    document.getElementById('closeImagePopupButton').addEventListener('click', closeImagePopup);
    document.getElementById('imageInput').addEventListener('change', handleFileSelect);
    if (mobile) {
        const uiContainer = document.getElementById("joystick-container")
        const putButton = document.getElementById("putButton")
        const activeTouches = {};
        let putButtonTouchId = null;
        uiContainer.style.display = "block"
        putButton.style.display = "block"
        
        gl.canvas.addEventListener('touchstart', (e) => {
            for (const touch of e.changedTouches) {
                activeTouches[touch.identifier] = {
                    startX: touch.clientX,
                    startY: touch.clientY,
                };
                if (isTouchOnPutButton(touch)) {
                    putButtonTouchId = touch.identifier;
                }
            }
        });

        gl.canvas.addEventListener('touchmove', (e) => {
            for (const touch of e.changedTouches) {
                const activeTouch = activeTouches[touch.identifier];

                if (activeTouch) {
                    const movementX = touch.clientX - activeTouch.startX;
                    const movementY = touch.clientY - activeTouch.startY;

                    if (putButtonTouchId !== touch.identifier) {
                        cameraRotation[1] += movementY * mouseSensitivity;
                        cameraRotation[0] -= movementX * mouseSensitivity;
                        cameraRotation[0] = Math.max(-Math.PI/2, Math.min(Math.PI/2, cameraRotation[0]));

                        activeTouch.startX = touch.clientX;
                        activeTouch.startY = touch.clientY;
                    }
                }
            }
        });
        gl.canvas.addEventListener('touchend', (e) => {
            for (const touch of e.changedTouches) {
                delete activeTouches[touch.identifier];
                if (putButtonTouchId === touch.identifier) {
                    putButtonTouchId = null;
                    showImagePopup();
                }
            }
        });

        gl.canvas.addEventListener('touchcancel', (e) => {
            for (const touch of e.changedTouches) {
                delete activeTouches[touch.identifier];

                if (putButtonTouchId === touch.identifier) {
                    putButtonTouchId = null;
                }
            }
        });
        putButton.addEventListener("pointerup", showImagePopup)
        uiContainer.addEventListener('pointerdown', handlePointerDown);
        uiContainer.addEventListener('pointermove', handlePointerMove);
        uiContainer.addEventListener('pointerup', handlePointerUp);
        uiContainer.addEventListener('pointercancel', handlePointerUp);
    } else {
        gl.canvas.onclick = function() {
            if (document.pointerLockElement !== gl.canvas) {
                gl.canvas.requestPointerLock();
            }
        };

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === gl.canvas) {
                cameraRotation[0] += e.movementY * mouseSensitivity;
                cameraRotation[1] += e.movementX * mouseSensitivity;
                cameraRotation[0] = Math.max(-Math.PI/2, Math.min(Math.PI/2, cameraRotation[0]));
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (e.button === 2) {
                keys['rightClick'] = true
                showImagePopup();
            }
        });
        document.addEventListener('mouseup', (e) => {
            if (e.button === 2) {
                keys['rightClick'] = false
            }
        });
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        setImage();
    }
}
function updateJoystickPosition(clientX, clientY) {
    const dx = clientX - joystickCenter.x;
    const dy = clientY - joystickCenter.y;
    const distance = Math.min(50, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx);
    joystickPosition.x = Math.cos(angle) * distance / 50;
    joystickPosition.y = Math.sin(angle) * distance / 50;
    const stick = document.querySelector('#joystick-container > div');
    stick.style.left = `${30 + joystickPosition.x * 30}px`;
    stick.style.top = `${30 + joystickPosition.y * 30}px`;
}
function handlePointerDown(e) {
    if (joystickTouchId === null) {
        joystickTouchId = e.pointerId;
        joystickCenter = { 
            x: e.currentTarget.offsetLeft + e.currentTarget.offsetWidth / 2, 
            y: e.currentTarget.offsetTop + e.currentTarget.offsetHeight / 2 
        };
        updateJoystickPosition(e.clientX, e.clientY);
    }
}

function handlePointerMove(e) {
    if (e.pointerId === joystickTouchId) {
        updateJoystickPosition(e.clientX, e.clientY);
    }
}

function handlePointerUp(e) {
    if (e.pointerId === joystickTouchId) {
        joystickTouchId = null;
        joystickPosition = { x: 0, y: 0 };
        e.currentTarget.lastElementChild.style.left = '30px';
        e.currentTarget.lastElementChild.style.top = '30px';
    }
}