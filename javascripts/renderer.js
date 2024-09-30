const vertexShaderSource = `
    attribute vec4 aPosition;
    attribute vec2 aTexCoord;
    attribute vec3 aNormal;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uLightSpaceMatrix;
    uniform mat3 uNormalMatrix;
    uniform vec2 uTextureScale;
    varying vec2 vTexCoord;
    varying vec3 vNormal;
    varying vec3 vFragPos;
    varying vec4 vPositionLightSpace;
    
    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aPosition;
        vTexCoord = aTexCoord * uTextureScale;
        vNormal = uNormalMatrix * aNormal;
        vFragPos = (uModelViewMatrix * aPosition).xyz;
        vPositionLightSpace = uLightSpaceMatrix * uModelViewMatrix * aPosition;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    uniform sampler2D uSampler;
    varying vec2 vTexCoord;
    varying vec3 vNormal;

    void main(void) {
        vec4 texColor = texture2D(uSampler, vTexCoord);
        
        vec3 ambient = 0.7 * texColor.rgb;
        
        gl_FragColor = vec4(ambient, texColor.a);
    }
`;

const shadowVertexShaderSource = `
    attribute vec4 aPosition;
    uniform mat4 uLightSpaceMatrix;
    uniform mat4 uModelMatrix;
    
    void main() {
        gl_Position = uLightSpaceMatrix * uModelMatrix * aPosition;
    }
`;

const shadowFragmentShaderSource = `
    precision mediump float;
    
    void main() {
        // WebGL 1.0 では何も書かないことで、深度情報がフレームバッファに自動で書き込まれるらしい。。。
    }
`;
function initWebGL(canvas) {
    const gl = canvas.getContext('webgl');
    if (!gl) {
        console.error("Failed to get WebGL context.");
        return null;
    }
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.62, 0.81, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    return gl;
}

function initShaders(gl) {
    const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error("Link error in shader program: " + gl.getProgramInfoLog(shaderProgram));
    }

    gl.useProgram(shaderProgram);

    positionAttrib = gl.getAttribLocation(shaderProgram, 'aPosition');
    texCoordAttrib = gl.getAttribLocation(shaderProgram, 'aTexCoord');
    normalAttrib = gl.getAttribLocation(shaderProgram, 'aNormal');
    projectionUniform = gl.getUniformLocation(shaderProgram, 'uProjectionMatrix');
    modelViewUniform = gl.getUniformLocation(shaderProgram, 'uModelViewMatrix');
    samplerUniform = gl.getUniformLocation(shaderProgram, 'uSampler');
    lightSpaceMatrixUniform = gl.getUniformLocation(shaderProgram, 'uLightSpaceMatrix');
    normalMatrixUniform = gl.getUniformLocation(shaderProgram, 'uNormalMatrix');
}

function initShadowShaders(gl) {
    const vertexShader = compileShader(gl, shadowVertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, shadowFragmentShaderSource, gl.FRAGMENT_SHADER);

    shadowShaderProgram = gl.createProgram();
    gl.attachShader(shadowShaderProgram, vertexShader);
    gl.attachShader(shadowShaderProgram, fragmentShader);
    gl.linkProgram(shadowShaderProgram);

    if (!gl.getProgramParameter(shadowShaderProgram, gl.LINK_STATUS)) {
        console.error("Link error in shadow shader program: " + gl.getProgramInfoLog(shadowShaderProgram));
    }
}

function initBuffers(gl) {
    const objectVertices = [
        -0.5, -0.5, 0.0,
        0.5, -0.5, 0.0,
        0.5, 0.5, 0.0,
        -0.5, 0.5, 0.0
    ];
    const objectNormals = [
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0
    ];
    const objectTexCoords = [
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0
    ];
    objectPositionBuffer = createBuffer(gl, objectVertices);
    objectNormalBuffer = createBuffer(gl, objectNormals);
    objectTexCoordBuffer = createBuffer(gl, objectTexCoords);
}

function initTextures(gl) {
    wallTexture = loadTexture(gl, ''); // If I didn't write it, it would be white.
    objectTexture = loadTexture(gl, 'images/floor_texture.png');
    floorTexture = loadTexture(gl, 'images/floor_texture.png', true, 5, 5);
    ceilingTexture = loadTexture(gl, 'images/floor_texture.png', true, 5, 5);
    // initObjects
    objects = [
        // walls
        {
            position: [0, 2.5, -10],
            rotation: [0, 0, 0],
            scale: [20, 5, 1],
            texture: wallTexture
        },
        {
            position: [0, 2.5, 10],
            rotation: [0, 0, 0],
            scale: [20, 5, 1],
            texture: wallTexture
        },
        {
            position: [10, 2.5, 0],
            rotation: [0, Math.PI/2, 0],
            scale: [20, 5, 1],
            texture: wallTexture
        },
        {
            position: [-10, 2.5, 0],
            rotation: [0, Math.PI/2, 0],
            scale: [20, 5, 1],
            texture: wallTexture
        },
        // ceiling
        {
            position: [0, 0, 0],
            rotation: [Math.PI/2, 0, 0],
            scale: [20, 20, 0],
            texture: ceilingTexture
        },
        // floor
        {
            position: [0, 5, 0],
            rotation: [Math.PI/2, 0, 0],
            scale: [20, 20, 0],
            texture: floorTexture
        },
    ];
}

function initShadowFramebuffer(gl) {
    shadowFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);
    // texture
    shadowDepthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, shadowDepthTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // buffer
    const depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 1024, 1024);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, shadowDepthTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.error('Framebuffer is not complete');
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function draw() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 4, gl.canvas.width / gl.canvas.height, 0.1, 100.0);

    const viewMatrix = mat4.create();
    mat4.rotateX(viewMatrix, viewMatrix, cameraRotation[0]);
    mat4.rotateY(viewMatrix, viewMatrix, cameraRotation[1]);
    mat4.translate(viewMatrix, viewMatrix, [-cameraPosition[0], -cameraPosition[1], -cameraPosition[2]]);

    gl.useProgram(shaderProgram);
    gl.uniformMatrix4fv(projectionUniform, false, projectionMatrix);

    const normalMatrix = mat3.create();
    mat3.normalFromMat4(normalMatrix, viewMatrix);
    const normalMatrixUniform = gl.getUniformLocation(shaderProgram, 'uNormalMatrix');
    gl.uniformMatrix3fv(normalMatrixUniform, false, normalMatrix);

    drawObjects(gl, viewMatrix, objects);
}

function drawObjects(gl, viewMatrix, objects) {
    gl.bindBuffer(gl.ARRAY_BUFFER, objectPositionBuffer);
    gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttrib);

    gl.bindBuffer(gl.ARRAY_BUFFER, objectNormalBuffer);
    gl.vertexAttribPointer(normalAttrib, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalAttrib);

    gl.bindBuffer(gl.ARRAY_BUFFER, objectTexCoordBuffer);
    gl.vertexAttribPointer(texCoordAttrib, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texCoordAttrib);

    for (let object of objects) {
        // texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, object.texture);
        // scale
        const scaleLocation = gl.getUniformLocation(shaderProgram, 'uTextureScale');
        gl.uniform2f(scaleLocation, object.texture.scaleS, object.texture.scaleT);

        gl.uniform1i(samplerUniform, 0);

        const modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, object.position);
        mat4.rotate(modelMatrix, modelMatrix, object.rotation[1], [0, 1, 0]);
        mat4.rotate(modelMatrix, modelMatrix, object.rotation[0], [1, 0, 0]);
        mat4.scale(modelMatrix, modelMatrix, object.scale);

        const modelViewMatrix = mat4.create();
        mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

        gl.uniformMatrix4fv(modelViewUniform, false, modelViewMatrix);

        const normalMatrix = mat3.create();
        mat3.normalFromMat4(normalMatrix, modelViewMatrix);
        gl.uniformMatrix3fv(normalMatrixUniform, false, normalMatrix);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }
}

function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createBuffer(gl, data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return buffer;
}
function createObject() {
    const object = {
        position: [0, 0, 0],
        rotation: [Math.PI, 0, 0],
        scale: [1, 1, 0.1],
        texture: null
    };

    const viewDir = [
        Math.sin(cameraRotation[1]) * Math.cos(cameraRotation[0]),
        -Math.sin(cameraRotation[0]),
        -Math.cos(cameraRotation[1]) * Math.cos(cameraRotation[0])
    ];

    const walls = [
        { normal: [0, 0, 1], distance: 10 },
        { normal: [0, 0, -1], distance: 10 },
        { normal: [1, 0, 0], distance: 10 },
        { normal: [-1, 0, 0], distance: 10 },
    ];

    let nearestIntersection = null;
    let nearestDistance = Infinity;
    let origin = cameraPosition
    let direction = viewDir
    for (let wall of walls) {
        const denominator = vec3.dot(wall.normal, direction);
        if (Math.abs(denominator) > 0.0001) {
            const t = (wall.distance - vec3.dot(wall.normal, origin)) / denominator;
            if (t >= 0 && t < nearestDistance) {
                nearestDistance = t;
                nearestIntersection = vec3.scaleAndAdd([], origin, direction, t);
            }
        }
    }

    if (nearestIntersection) {
        object.position = nearestIntersection;
        // little forward
        const offset = 0.1;
        vec3.scaleAndAdd(object.position, object.position, viewDir, -offset);

        // rotate
        const angleY = Math.atan2(-viewDir[0], -viewDir[2]);
        object.rotation[1] = angleY;
    } else {
        console.error('No valid wall intersection found');
        return null;
    }

    // setTexture
    object.texture = objectTexture;

    // Adjust scale
    if (object.texture && object.texture.image) {
        const aspectRatio = object.texture.image.width / object.texture.image.height;
        const baseScale = 2.0;
        
        if (aspectRatio > 1) {
            object.scale = [baseScale, baseScale / aspectRatio, 0.1];
        } else {
            object.scale = [baseScale * aspectRatio, baseScale, 0.1];
        }
    }
    objects.push(object);

    return object;
}
function loadTexture(gl, url, repeat = false, scaleS = 1, scaleT = 1) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const pixel = new Uint8Array([255, 255, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    texture.scaleS = scaleS;
    texture.scaleT = scaleT;
    texture.repeat = repeat

    const image = new Image();
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        
        if (repeat) {
            // Images used for repeats must be powers of 2.   !!!important!!!
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        const scaleLocation = gl.getUniformLocation(shaderProgram, 'uTextureScale');
        gl.uniform2f(scaleLocation, scaleS, scaleT);
    };
    texture.image = image;
    image.src = url;
    return texture;
}
function loadTextureFromFile(gl, file, callback ,scaleS = 1, scaleT = 1) {
    const texture = gl.createTexture();
    texture.scaleS = scaleS;
    texture.scaleT = scaleT;
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const pixel = new Uint8Array([255, 255, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

    const reader = new FileReader();
    reader.onload = function(event) {
        const image = new Image();
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.useProgram(shaderProgram)
        const scaleLocation = gl.getUniformLocation(shaderProgram, 'uTextureScale');
        gl.uniform2f(scaleLocation, 1, 1);
            if (callback) callback(texture);
        };
        image.src = event.target.result;
        texture.image = image;
    };
    reader.readAsDataURL(file);
}