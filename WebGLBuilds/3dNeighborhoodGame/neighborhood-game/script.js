import * as THREE from "three";

import {
    GLTFLoader
}
from "three/addons/loaders/GLTFLoader.js";

import {
    DRACOLoader
}
from "three/addons/loaders/DRACOLoader.js";


// =========================================================
// CANVAS
// =========================================================

const canvas =
    document.querySelector(
        ".webgl"
    );


// =========================================================
// SCENE
// =========================================================

const scene =
    new THREE.Scene();

scene.background =
    new THREE.Color(
        0x87ceeb
    );

scene.fog =
    new THREE.Fog(
        0x87ceeb,
        40,
        180
    );


// =========================================================
// CAMERA
// =========================================================

const camera =
    new THREE.PerspectiveCamera(
        60,
        window.innerWidth /
        window.innerHeight,
        0.1,
        500
    );

camera.position.set(
    0,
    5,
    8
);

scene.add(
    camera
);


// =========================================================
// RENDERER
// =========================================================

const renderer =
    new THREE.WebGLRenderer({
        canvas,
        antialias: true
    });

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    Math.min(
        window.devicePixelRatio,
        2
    )
);

renderer.shadowMap.enabled =
    true;

renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

renderer.outputColorSpace =
    THREE.SRGBColorSpace;

renderer.toneMapping =
    THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure =
    1;


// =========================================================
// LIGHTING
// =========================================================

const hemisphereLight =
    new THREE.HemisphereLight(
        0xcfeeff,
        0x6b7c4b,
        2.5
    );

scene.add(
    hemisphereLight
);


const sun =
    new THREE.DirectionalLight(
        0xffffff,
        3
    );

sun.position.set(
    30,
    50,
    20
);

sun.castShadow =
    true;

sun.shadow.mapSize.set(
    2048,
    2048
);

sun.shadow.camera.left =
    -80;

sun.shadow.camera.right =
    80;

sun.shadow.camera.top =
    80;

sun.shadow.camera.bottom =
    -80;

scene.add(
    sun
);


// =========================================================
// LOADERS
// =========================================================

const loadingManager =
    new THREE.LoadingManager();


const loadingScreen =
    document.querySelector(
        "#loadingScreen"
    );


loadingManager.onLoad =
    () => {

        loadingScreen
            .classList
            .add(
                "hidden"
            );

    };


const dracoLoader =
    new DRACOLoader(
        loadingManager
    );

dracoLoader.setDecoderPath(
    "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/libs/draco/"
);


const loader =
    new GLTFLoader(
        loadingManager
    );

loader.setDRACOLoader(
    dracoLoader
);


// =========================================================
// NEIGHBORHOOD
// =========================================================

let neighborhood;


loader.load(

    "./assets/neighborhood.glb",

    (gltf) => {

        neighborhood =
            gltf.scene;

        scene.add(
            neighborhood
        );


        neighborhood.traverse(
            (child) => {

                if (
                    child.isMesh
                ) {

                    child.castShadow =
                        true;

                    child.receiveShadow =
                        true;

                }

            }
        );

    },

    undefined,

    (error) => {

        console.error(
            "Neighborhood loading error:",
            error
        );

    }

);


// =========================================================
// PLAYER
// =========================================================

const player =
    new THREE.Group();

scene.add(
    player
);


player.position.set(
    0,
    0,
    0
);


let characterModel;

let mixer;

let walkAction;

let idleAction;


// =========================================================
// LOAD CHARACTER
// =========================================================

loader.load(

    "./assets/character.glb",

    (gltf) => {

        characterModel =
            gltf.scene;


        characterModel.scale.set(
            .2,
            .2,
            .2
        );


        characterModel.traverse(
            (child) => {

                if (
                    child.isMesh
                ) {

                    child.castShadow =
                        true;

                    child.receiveShadow =
                        true;

                }

            }
        );


        player.add(
            characterModel
        );


        // ---------------------------------------------
        // ANIMATION MIXER
        // ---------------------------------------------

        mixer =
            new THREE.AnimationMixer(
                characterModel
            );


        console.log(
            "Animations:",
            gltf.animations
        );


        if (
            gltf.animations.length > 0
        ) {

            walkAction =
                mixer.clipAction(
                    gltf.animations[0]
                );

        }


        if (
            gltf.animations.length > 1
        ) {

            idleAction =
                mixer.clipAction(
                    gltf.animations[1]
                );

            idleAction.play();

        }

    },

    undefined,

    (error) => {

        console.error(
            "Character loading error:",
            error
        );

    }

);


// =========================================================
// FLOOR COLLISION HEIGHT
// =========================================================

const groundHeight =
    0;


// =========================================================
// KEYBOARD INPUT
// =========================================================

const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    run: false
};


window.addEventListener(
    "keydown",
    (event) => {

        switch (
            event.code
        ) {

            case "KeyW":
            case "ArrowUp":

                keys.forward =
                    true;

                break;


            case "KeyS":
            case "ArrowDown":

                keys.backward =
                    true;

                break;


            case "KeyA":
            case "ArrowLeft":

                keys.left =
                    true;

                break;


            case "KeyD":
            case "ArrowRight":

                keys.right =
                    true;

                break;


            case "ShiftLeft":
            case "ShiftRight":

                keys.run =
                    true;

                break;

        }

    }
);


window.addEventListener(
    "keyup",
    (event) => {

        switch (
            event.code
        ) {

            case "KeyW":
            case "ArrowUp":

                keys.forward =
                    false;

                break;


            case "KeyS":
            case "ArrowDown":

                keys.backward =
                    false;

                break;


            case "KeyA":
            case "ArrowLeft":

                keys.left =
                    false;

                break;


            case "KeyD":
            case "ArrowRight":

                keys.right =
                    false;

                break;


            case "ShiftLeft":
            case "ShiftRight":

                keys.run =
                    false;

                break;

        }

    }
);


// =========================================================
// CAMERA ORBIT CONTROL
// =========================================================

let cameraYaw =
    0;

let cameraPitch =
    -0.25;


let mouseDown =
    false;


window.addEventListener(
    "mousedown",
    () => {

        mouseDown =
            true;

    }
);


window.addEventListener(
    "mouseup",
    () => {

        mouseDown =
            false;

    }
);


window.addEventListener(
    "mousemove",
    (event) => {

        if (
            !mouseDown
        ) {

            return;

        }


        cameraYaw -=
            event.movementX *
            0.004;


        cameraPitch -=
            event.movementY *
            0.003;


        cameraPitch =
            THREE.MathUtils.clamp(
                cameraPitch,
                -0.75,
                0.45
            );

    }
);


// =========================================================
// MOVEMENT SETTINGS
// =========================================================

const WALK_SPEED =
    4;

const RUN_SPEED =
    7;


const direction =
    new THREE.Vector3();


const cameraForward =
    new THREE.Vector3();


const cameraRight =
    new THREE.Vector3();


let currentlyWalking =
    false;


// =========================================================
// PLAYER MOVEMENT
// =========================================================

function updatePlayer(
    delta
) {

    direction.set(
        0,
        0,
        0
    );


    camera.getWorldDirection(
        cameraForward
    );


    cameraForward.y =
        0;

    cameraForward.normalize();


    cameraRight.crossVectors(
        cameraForward,
        new THREE.Vector3(
            0,
            1,
            0
        )
    );


    cameraRight.normalize();


    if (
        keys.forward
    ) {

        direction.add(
            cameraForward
        );

    }


    if (
        keys.backward
    ) {

        direction.sub(
            cameraForward
        );

    }


    if (
        keys.right
    ) {

        direction.add(
            cameraRight
        );

    }


    if (
        keys.left
    ) {

        direction.sub(
            cameraRight
        );

    }


    const moving =
        direction.lengthSq() >
        0;


    if (
        moving
    ) {

        direction.normalize();


        const speed =
            keys.run
                ? RUN_SPEED
                : WALK_SPEED;


        player.position.addScaledVector(
            direction,
            speed *
            delta
        );


        // ---------------------------------------------
        // ROTATE CHARACTER TOWARD MOVEMENT
        // ---------------------------------------------

        const targetAngle =
            Math.atan2(
                direction.x,
                direction.z
            );


        const targetQuaternion =
            new THREE.Quaternion()
                .setFromAxisAngle(
                    new THREE.Vector3(
                        0,
                        1,
                        0
                    ),
                    targetAngle
                );


        player.quaternion.slerp(
            targetQuaternion,
            Math.min(
                1,
                10 *
                delta
            )
        );

    }


    player.position.y =
        groundHeight;


    updateAnimation(
        moving
    );

}


// =========================================================
// WALK ANIMATION
// =========================================================

function updateAnimation(
    moving
) {

    if (
        !walkAction
    ) {

        return;

    }


    if (
        moving &&
        !currentlyWalking
    ) {

        if (
            idleAction
        ) {

            idleAction.fadeOut(
                0.2
            );

        }


        walkAction
            .reset()
            .fadeIn(
                0.2
            )
            .play();


        currentlyWalking =
            true;

    }


    if (
        !moving &&
        currentlyWalking
    ) {

        walkAction.fadeOut(
            0.2
        );


        if (
            idleAction
        ) {

            idleAction
                .reset()
                .fadeIn(
                    0.2
                )
                .play();

        }


        currentlyWalking =
            false;

    }

}


// =========================================================
// THIRD PERSON CAMERA
// =========================================================

const cameraTarget =
    new THREE.Vector3();


const desiredCameraPosition =
    new THREE.Vector3();


const CAMERA_DISTANCE =
    7;

const CAMERA_HEIGHT =
    3;


function updateCamera(
    delta
) {

    cameraTarget.copy(
        player.position
    );

    cameraTarget.y +=
        1.7;


    const horizontalDistance =
        CAMERA_DISTANCE *
        Math.cos(
            cameraPitch
        );


    const verticalDistance =
        CAMERA_DISTANCE *
        Math.sin(
            cameraPitch
        );


    desiredCameraPosition.set(

        player.position.x +
        Math.sin(
            cameraYaw
        ) *
        horizontalDistance,

        player.position.y +
        CAMERA_HEIGHT -
        verticalDistance,

        player.position.z +
        Math.cos(
            cameraYaw
        ) *
        horizontalDistance

    );


    camera.position.lerp(
        desiredCameraPosition,
        Math.min(
            1,
            6 *
            delta
        )
    );


    camera.lookAt(
        cameraTarget
    );

}


// =========================================================
// OPTIONAL GROUND
// =========================================================

const groundGeometry =
    new THREE.PlaneGeometry(
        300,
        300
    );


const groundMaterial =
    new THREE.MeshStandardMaterial({

        color:
            0x63a64c,

        roughness:
            1

    });


const ground =
    new THREE.Mesh(
        groundGeometry,
        groundMaterial
    );


ground.rotation.x =
    -Math.PI /
    2;


ground.position.y =
    -0.02;


ground.receiveShadow =
    true;


scene.add(
    ground
);


// =========================================================
// RESIZE
// =========================================================

window.addEventListener(
    "resize",
    () => {

        camera.aspect =
            window.innerWidth /
            window.innerHeight;


        camera.updateProjectionMatrix();


        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );


        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio,
                2
            )
        );

    }
);


// =========================================================
// ANIMATION LOOP
// =========================================================

const clock =
    new THREE.Clock();


function animate() {

    const delta =
        Math.min(
            clock.getDelta(),
            0.05
        );


    updatePlayer(
        delta
    );


    updateCamera(
        delta
    );


    if (
        mixer
    ) {

        mixer.update(
            delta
        );

    }


    renderer.render(
        scene,
        camera
    );


    requestAnimationFrame(
        animate
    );

}


animate();