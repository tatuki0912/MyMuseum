function updateCamera() {
    let newPosition = [...cameraPosition];

    if (mobile) {
        newPosition[0] += (-Math.cos(cameraRotation[1]) * joystickPosition.y - Math.sin(cameraRotation[1]) * joystickPosition.x) * moveSpeed;
        newPosition[2] -= (Math.sin(cameraRotation[1]) * joystickPosition.y - Math.cos(cameraRotation[1]) * joystickPosition.x) * moveSpeed;
    } else {
        if (keys['KeyW'] || keys['ArrowUp']) {
            newPosition[0] += Math.sin(cameraRotation[1]) * moveSpeed;
            newPosition[2] -= Math.cos(cameraRotation[1]) * moveSpeed;
        }
        if (keys['KeyS'] || keys['ArrowDown']) {
            newPosition[0] -= Math.sin(cameraRotation[1]) * moveSpeed;
            newPosition[2] += Math.cos(cameraRotation[1]) * moveSpeed;
        }
        if (keys['KeyA'] || keys['ArrowLeft']) {
            newPosition[0] -= Math.cos(cameraRotation[1]) * moveSpeed;
            newPosition[2] -= Math.sin(cameraRotation[1]) * moveSpeed;
        }
        if (keys['KeyD'] || keys['ArrowRight']) {
            newPosition[0] += Math.cos(cameraRotation[1]) * moveSpeed;
            newPosition[2] += Math.sin(cameraRotation[1]) * moveSpeed;
        }
        // debug only
        if(fly){
            if(keys['Space']){
                newPosition[1] += moveSpeed;
            }
            if(keys['ShiftLeft']){
                newPosition[1] -= moveSpeed;
            }
        }
        // popupClose
        if(keys['Escape'] && document.pointerLockElement === null){
            closeAllPopup()
        }
    }

    if (!checkCollision(newPosition) || fly) {
        cameraPosition[0] = newPosition[0];
        cameraPosition[1] = newPosition[1];
        cameraPosition[2] = newPosition[2];
    }
}

function checkCollision(newPosition) {
    const PLAYER_RADIUS = 0.1;
    const WALL_THICKNESS = 0.1;

    return (newPosition[0] < -10 + PLAYER_RADIUS + WALL_THICKNESS ||
            newPosition[0] > 10 - PLAYER_RADIUS - WALL_THICKNESS ||
            newPosition[2] < -10 + PLAYER_RADIUS + WALL_THICKNESS ||
            newPosition[2] > 10 - PLAYER_RADIUS - WALL_THICKNESS);
}